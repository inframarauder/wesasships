const express = require('express');
const router = express.Router();
const Student = require('../models/student-model');
const passport = require('passport');
const async = require('async');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const keys = require('../configs/keys');
const validateEmail = require('../configs/check-email');
const Skill = require('../models/skill-model');

//====ROUTES GO HERE===//
function isEmailVerified(req,res,next){
    if(req.user.emailVerified){
        return next();
    }else{
        res.redirect('/students/verifyEmail');
    }
}

function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    else{
        res.redirect('/students/login');
    }
}

//dashboard route:
router.get('/dashboard',isLoggedIn,isEmailVerified,(req,res)=>{
    const flashMessages = res.locals.getMessages();
    Skill.find({},(err,skills)=>{
        if(err){
            console.log(err);
        }else{
           res.render('student-dashboard',{user:null,messages:flashMessages,student:req.user,skills:skills,applying:false,internship:null});
        }
    });
});

router.get('/dashboard/apply_internship',isLoggedIn,isEmailVerified,(req,res)=>{
    const flashMessages = res.locals.getMessages();
    Student.findById(req.user._id,(err,student)=>{
        if(err){
            console.log(err);
        }else{
            var alreadyApplied = false;
            for(var i=0; i<student.internshipsApplied.length; i++){
                if(student.internshipsApplied[i].equals(req.query.id)){
                    alreadyApplied = true;
                    break;
                }
            }
            if(alreadyApplied){
                res.redirect('/internships/details/?id='+req.query.id);
            }else{
                Skill.find({},(err,skills)=>{
                    if(err){
                        console.log(err);
                    }else{
                       res.render('student-dashboard',{user:null,messages:flashMessages,student:req.user,skills:skills,applying:true,id:req.query.id});
                    }
                });
            }
        }
    });
});


router.post('/dashboard',(req,res)=>{
    Student.findById(req.user._id,(err,user)=>{
        if(err){
            console.log(err);
        }else{
            user.premium_user = true;
        }
        user.save((err)=>{
            if(err){
                console.log(err);
            }else{
                req.flash('successMessage',"Congrats, you're a premium user now! Add as many skills as you want and build a strong resume!");
                res.redirect('/students/dashboard');
            }
        });
    });
    
});

router.get('/dashboard/applications',isLoggedIn,(req,res)=>{
    const flashMessages = res.locals.getMessages();
    res.render('view-applications',{user:null,messages:flashMessages,student:req.user});
});

//education:
router.post('/dashboard/resume/education',isLoggedIn,(req,res)=>{
    var class10={},class12={},undergrad={},postgrad={},phd={},diploma={};

    if(req.body.year_10 !="" &&req.body.school_10 !=""&&req.body.score_10 !=""&&req.body.board_10 !=""){
        class10.year = req.body.year_10;
        class10.school = req.body.school_10;
        class10.score = req.body.score_10;
        class10.board = req.body.board_10;
    }

    if(req.body.year_12 !="" &&req.body.school_12 !=""&&req.body.score_12 !=""&&req.body.board_12 !=""){
        class12.year = req.body.year_12;
        class12.school = req.body.school_12;
        class12.score = req.body.score_12;
        class12.board = req.body.board_12;
    }

    if(req.body.year_undergrad !="" &&req.body.college_undergrad !=""&&req.body.score_undergrad !=""&&req.body.undergrad_status !="off"){
        undergrad.year = req.body.year_undergrad;
        undergrad.school = req.body.college_undergrad;
        undergrad.score = req.body.score_undergrad;
        undergrad.status = req.body.undergrad_status;
    }

    if(req.body.year_postgrad !="" &&req.body.college_postgrad !=""&&req.body.score_postgrad !=""&&req.body.postgrad_status !="off"){
        postgrad.year = req.body.year_postgrad;
        postgrad.school = req.body.college_postgrad;
        postgrad.score = req.body.score_postgrad;
        postgrad.status = req.body.postgrad_status;
    }
    if(req.body.year_phd !="" &&req.body.college_phd !=""&&req.body.score_phd !=""&&req.body.phd_status !="off"){
        phd.year = req.body.year_phd;
        phd.school = req.body.college_phd;
        phd.score = req.body.score_phd;
        phd.status = req.body.phd_status;
    }
    if(req.body.year_diploma !="" &&req.body.college_diploma !=""&&req.body.score_diploma !=""&&req.body.diploma_status !="off"){
        diploma.year = req.body.year_diploma;
        diploma.school = req.body.college_diploma;
        diploma.score = req.body.score_diploma;
        diploma.status = req.body.undergrad_diploma;
    }
    Student.findOne({username:req.user.username},(err,student)=>{
        if(err){
            console.log(err);
        }else{
           student.education = {
            class10:class10,
            class12:class12,
            undergrad:undergrad,
            postgrad:postgrad,
            diploma:diploma,
            phd:phd
           };
        }

        student.save((err)=>{
            if(err){
                console.log(err);
            }else{
                console.log('resume updated');
                req.flash('successMessage','Resume Updated!');
                res.redirect('/students/dashboard');
            }
        });
    });
    
});

//skills :
router.post('/dashboard/resume/skills',isLoggedIn,(req,res)=>{
    Skill.findOne({skill:req.body.skill},(err,skill)=>{
        if(err){
            console.log(err);
        }else{
          res.render('quiz-page',{user:null,student:req.user,skill:skill,score:null});
        }
    });
});

function addSkill(studentID,skill,score){
    Student.findById(studentID,(err,student)=>{
        if(err){
            console.log(err);
        }else{
            student.skills.push({skill:skill.skill,score:score});
            student.save();
        }
    });
}

router.post('/dashboard/resume/skills/quiz/:id',isLoggedIn,(req,res)=>{
    var score = 0;
    Skill.findById(req.params.id,(err,skill)=>{
        if(err){
            console.log(err);
        }else{
            for(var i=0; i<skill.questions.length; i++){
                if(req.body["answer"+(i+1)] === skill.questions[i].answer){
                    score++;
                }
            }
            addSkill(req.user._id,skill,score);
            res.render('quiz-page',{user:null,student:req.user,skill:skill,score:score});
        }
    });
});

router.delete('/dashboard/resume/skills/:skill',(req,res)=>{
    Student.findById(req.user._id,(err,student)=>{
        if(err){
            console.log(err);
        }else{
          var filteredArray =   student.skills.filter((value,index,arr)=>{
                return (value.skill != req.params.skill); 
            });
            student.skills = filteredArray;
            student.save((err)=>{
                if(err){
                    console.log(err);
                }else{
                    res.send();
                }
            });
        }
    });
}); 

//trainings:
router.post('/dashboard/resume/trainings',(req,res)=>{
    Student.findById(req.user._id,(err,student)=>{
        if(err){
            console.log(err);
        }else{
            student.trainings.push({
                name:req.body.training_name,
                org:req.body.training_org,
                desc:req.body.training_desc
            });

            student.save((err)=>{
                if(err){
                    console.log(err);
                }else{
                    req.flash('successMessage','Resume Updated!');
                    res.redirect('/students/dashboard');
                }
            });
        }
    });
});

//projects:

router.post('/dashboard/resume/projects',(req,res)=>{
    Student.findById(req.user._id,(err,student)=>{
        if(err){
            console.log(err);
        }else{
            student.projects.push({
                name:req.body.proj_name,
                link:req.body.proj_link,
                desc:req.body.proj_desc
            });

            student.save((err)=>{
                if(err){
                    console.log(err);
                }else{
                    req.flash('successMessage','Resume Updated!');
                    res.redirect('/students/dashboard');
                }
            });
        }
    });
});

//work experience:
router.post('/dashboard/resume/work_exp',(req,res)=>{
    Student.findById(req.user._id,(err,student)=>{
        if(err){
            console.log(err);
        }else{
            student.work_experience.push({
                name:req.body.work_name,
                org:req.body.work_org,
                desc:req.body.work_desc
            });

            student.save((err)=>{
                if(err){
                    console.log(err);
                }else{
                    req.flash('successMessage','Resume Updated!');
                    res.redirect('/students/dashboard');
                }
            });
        }
    });
})

//achievements:
router.post('/dashboard/resume/achievements',(req,res)=>{
    Student.findById(req.user._id,(err,student)=>{
        if(err){
            console.log(err);
        }else{
            student.achievements.push({
                name:req.body.ach_name,
                desc:req.body.ach_desc
            });

            student.save((err)=>{
                if(err){
                    console.log(err);
                }else{
                    req.flash('successMessage','Resume Updated!');
                    res.redirect('/students/dashboard');
                }
            });
        }
    });
});

var redirectUrl = '/students/dashboard';

function setRedirectUrl(req,res,next){
    console.log(req.headers.referer);
    if(req.headers.referer.includes('/internships/details')){
        redirectUrl  = '/students/dashboard/apply_internship/'+req.headers.referer.substring(req.headers.referer.indexOf('?'));
    }else{
        redirectUrl = '/students/dashboard';
    }
    next();
}


//google-signup route:
    router.get('/signup/google',setRedirectUrl,passport.authenticate('google',{scope:['email','profile','openid']}));


router.get('/google/redirect',passport.authenticate('google',{failureRedirect:'/students/login',failureFlash:true}),(req,res)=>{
    res.redirect(redirectUrl);
});


//signup-student route:
router.get('/signup',(req,res)=>{
    const flashMessages = res.locals.getMessages();
    res.render('signup-student',{user:null,student:null,errors:null,messages:flashMessages});
});
router.post('/signup',(req,res)=>{
    var  username= req.body.username;
    var password = req.body.password;
    var FirstName= req.body.FirstName;
    var LastName = req.body.LastName;
  var phoneNumber= req.body.phoneNumber;
  if(validateEmail(username) === false){
      req.flash('errorMessage','Invalid email address!');
      return res.redirect('/students/signup');
  }
  if(FirstName === ""){
      req.flash('errorMessage','You must provide your name');
     return  res.redirect('/students/signup');      
  }
  if(password.length < 6){
    req.flash('errorMessage','Password length should be atleast 6');
    return  res.redirect('/students/signup');      
}
    Student.register(new Student({username:username,firstName:FirstName,lastName:LastName,phoneNumber:phoneNumber,usertype:'student'}),password,(err,user)=>{
        if(err)
        {
            console.log(err);
           return  res.render('signup-student',{errors:err,messages:null});
        }
        else{
            passport.authenticate('student-local')(req,res,()=>{
                res.redirect('/students/verifyEmail');
            });     
        }
    });
});

//email verification route:

router.get('/verifyEmail',isLoggedIn,(req,res)=>{
    const flashMessages = res.locals.getMessages();
    res.render('verify-email',{user:req.user,student:req.user,messages:flashMessages});
});

router.post('/verifyEmail',(req,res)=>{
    var email = req.user.username;
    async.waterfall([
        (done)=>{
            crypto.randomBytes(20,(err,buff)=>{
                var token = buff.toString('hex');
                done(err,token);
            });
        },
           //nodemailer setup:
           (token,done)=>{
            var smtpTransport = nodemailer.createTransport({
                service:'Gmail',
                auth:{
                    user:keys.email.emailID,
                    pass: keys.email.password
                },
                tls:{
                    rejectUnauthorized:false
                }
            });
            var mailOptions = {
                to: email,
                from:keys.email.emailID,
                subject:'Wesasships Email Verification',
                text:'Please click the following link to activate your Wesasships account'+'\n\n'+
                'http://'+req.headers.host+'/students/activateEmail/'+token+'\n\n'
            };
            smtpTransport.sendMail(mailOptions,(err)=>{
             done(err,'done');
            });
        },
    ], 
     (err)=>{
         if(err){
            console.log(err);
            req.flash('errorMessage','Mail not sent!');
            res.redirect('/students/verifyEmail');
         } else{
            req.flash('successMessage','Email Sent! Check your mail.....');       
            res.redirect('/students/verifyEmail');
         }  
    });
});

router.get('/activateEmail/:token',(req,res)=>{
    Student.findById(req.user._id,(err,student)=>{
        if(err){
            console.log(err);
        }else{
            student.emailVerified = true;

            student.save(err=>{
                if(err){
                    console.log(err);
                }else{
                   res.redirect('/students/dashboard');
                }
            })
        }
    })

});

//login-routes:
router.get('/login',(req,res)=>{
    const flashMessages = res.locals.getMessages();
    res.render('index',{error:{msg:flashMessages.error}});
    
});
router.post('/login',passport.authenticate('student-local',{
    failureRedirect:'/students/login',
    failureFlash:true,
}),(req,res)=>{
    if(req.headers.referer.includes('/internships/details')){
        res.redirect('/students/dashboard/apply_internship/'+req.headers.referer.substring(req.headers.referer.indexOf('?')));
    }else{
        res.redirect('/students/dashboard');
    }
});

//logout route:
router.get('/logout',(req,res)=>{
    req.logout();
    res.redirect('/');
});

//password reset:

router.get('/forgot',(req,res)=>{
    const flashMessages = res.locals.getMessages();
    res.render('forgot',{messages:flashMessages,root:"students"});
});

router.post('/forgot',(req,res)=>{
    async.waterfall([
        (done)=>{
            crypto.randomBytes(20,(err,buff)=>{
                var token = buff.toString('hex');
                done(err,token);
            });
        },
        (token,done)=>{
            Student.findOne({username:req.body.username},(err,user)=>{
                if(!user){
                    req.flash('errorMessage','No user is registered with that email!');
                    return res.redirect('/students/forgot');
                }
                
                user.resetPasswordToken = token;
                user.resetPasswordExpires= Date.now()+ 3600000; //token valid for 1 hour

                user.save((err)=>{
                    done(err,token,user);
                });
            });
        },
        //nodemailer setup:
        (token,user,done)=>{
            var smtpTransport = nodemailer.createTransport({
                service:'Gmail',
                auth:{
                    user:keys.email.emailID,
                    pass: keys.email.password
                },
                tls:{
                    rejectUnauthorized:false
                }
            });
            var mailOptions = {
                to: user.username,
                from:keys.email.emailID,
                subject:'Wesasships password reset',
                text:'You have recieved this mail because you requested for a link to reset the password of your Wesasships account.'+'\n'+
                'Please click the following link to reset the password (valid only for 1 hour)'+'\n\n'+
                'http://'+req.headers.host+'/students/reset/'+token+'\n\n'+
                'If you did not request for it, please ignore this mail and your account shall be safe.'
            };
            smtpTransport.sendMail(mailOptions,(err)=>{
             req.flash('successMessage','Email sent. Please check your mail.');
             done(err,'done');
            });
        },
    ], 
     (err)=>{
         if(err) console.log(err);
        res.redirect('/students/forgot');
    });
});

router.get('/reset/:token',(req,res)=>{
    Student.findOne({resetPasswordToken:req.params.token,resetPasswordExpires:{$gt: Date.now()}},(err,user)=>{
         if(!user){
             req.flash('errorMessage','Token is invalid or has expired.Try again!');
             return res.redirect('/forgot');
         }
         const flashMessages = res.locals.getMessages();
         res.render('reset',{token:req.params.token,messages:flashMessages,root:"students"});

    });
});

router.post('/reset/:token',(req,res)=>{
    async.waterfall([
        (done)=>{
            Student.findOne({resetPasswordToken:req.params.token,resetPasswordExpires:{$gt: Date.now()}},(err,user)=>{
                if(!user){
                   req.flash('errorMessage','Token is invalid or has expired.Try again!');                    
                    return res.redirect('/students/forgot');
                }
                if(req.body.password === ""){
                    req.flash('errorMessage','Password cant be empty!');
                    res.redirect('back');
                }
                if(req.body.password === req.body.confirm){
                    user.setPassword(req.body.password,(err)=>{
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save((err)=>{
                            req.logIn(user,(err)=>{
                                done(err,user);
                            });
                        });
                    });
                }
                else{
                   req.flash('errorMessage','Passwords dont match!');
                    res.redirect('back');
                }
            });
        },
        (user,done)=>{
            var smtpTransport = nodemailer.createTransport({
                service:'Gmail',
                auth:{
                    user:keys.email.emailID,
                    pass:keys.email.password
                },
                tls:{
                    rejectUnauthorized:false
                }
            });
            var mailOptions={
                to: user.username,
                from:keys.email.emailID,
                subject:'Password Changed',
                text:'Hello,'+'\n'+
                'This is to inform you that the password of your Wesasships account linked to this email ID has been reset!'
            };
            smtpTransport.sendMail(mailOptions,(err)=>{
                 req.flash('successMessage','Password Reset!');                
                done(err);
            });
        },
        (err)=>{
            if(err) console.log(err) ;
            res.redirect('/students/dashboard');
        }
    ]);
});

//===MANAGE ACCOUNT ROUTE==//

router.get('/manage_account',isLoggedIn,(req,res)=>{
    const flashMessages = res.locals.getMessages();
    res.render('manage-account',{messages:flashMessages,user:req.user,student:null});
});

router.post('/manage_account',isLoggedIn,(req,res)=>{
    Student.findOne({username:req.user.username},(err,user)=>{
        if(err) console.log(err);
        else{
          //  console.log(validateEmail(req.body.username));
            if(req.body.username === "" || validateEmail(req.body.username) ===false){
                req.flash('errorMessage','Email is invalid!');
                res.redirect('/students/manage_account');
            }
            else{
                user.username = req.body.username;
                user.firstName = req.body.firstName;
                user.lastName = req.body.lastName;
                user.phoneNumber = req.body.phoneNumber;
                user.city = req.body.city;

                user.save((err)=>{
                    if(err) console.log(err);
                    else{
                        req.logIn(user,(err)=>{
                            if(err) console.log(err);
                            else{
                                req.flash('successMessage','Details updated successfully!');
                                res.redirect('/students/dashboard');
                            }
                        });
                    }
                });
            }
            
        }
    
    });
});

//==DELETE ACCOUNT==//

router.get('/delete_account',isLoggedIn,(req,res)=>{
    res.render('delete-account',{user: req.user,student:null});
});


router.delete('/delete_account/:user_id',(req,res)=>{
    var query = {_id:req.params.user_id};
    Student.deleteOne(query,(err)=>{
        if(err) console.log(err);
        else{
            res.send();
        }
    });
});



module.exports=router;
