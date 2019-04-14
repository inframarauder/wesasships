const express = require('express');
const router = express.Router();
const Employer = require('../models/employer-model');
const Internship = require('../models/internship-model');
const passport = require('passport');
const async = require('async');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const keys = require('../configs/keys');
const validateEmail = require('../configs/check-email'); 
const multer = require('multer');

//multer setup:

const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'./uploads');
    },
    
    filename:(req,file,cb)=>{
        cb(null, Date.now() +'.jpg');
    }
});

const fileFilter = (req,file,cb)=>{
    if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png'){ //only these formats allowed
        cb(null,true);
    }else{
        cb(new Error('Invalid file format!'),false);
    }
}

const upload = multer({
    storage:storage,
    limits:  {
        fileSize: 1024*1024*2// 2MB limit
    },
    fileFilter:fileFilter
});

//====ROUTES GO HERE===//
function isEmailVerified(req,res,next){
    if(req.user.emailVerified){
        return next();
    }else{
        res.redirect('/employers/verifyEmail');
    }
}
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    else{
        res.redirect('/employers/login');
    }
}

//signup-Employer route:
router.get('/signup',(req,res)=>{
    const flashMessages = res.locals.getMessages();
    res.render('signup-employer',{errors:null,messages:flashMessages});
});
router.post('/signup',(req,res)=>{
    var  username= req.body.username;
    var password = req.body.password;
    var FirstName= req.body.FirstName;
    var LastName = req.body.LastName;
  var phoneNumber= req.body.phoneNumber;
  if(validateEmail(username) === false){
    req.flash('errorMessage','Invalid email address!');
    return res.redirect('/employers/signup');
}
if(FirstName === ""){
    req.flash('errorMessage','You must provide your name');
   return  res.redirect('/employers/signup');      
}
if(password.length < 6){
    req.flash('errorMessage','Password length should be atleast 6');
    return  res.redirect('/employers/signup');      
}
    Employer.register(new Employer({username:username,firstName:FirstName,lastName:LastName,phoneNumber:phoneNumber,usertype:'employer'}),password,(err,user)=>{
        if(err)
        {
            console.log(err);
           return  res.render('signup-employer',{errors:err,messages:null});
        }
        else{
            passport.authenticate('employer-local')(req,res,()=>{
                res.redirect('/employers/verifyEmail');
            });     
        }
    });
});

//email verification routes:

router.get('/verifyEmail',isLoggedIn,(req,res)=>{
    const flashMessages = res.locals.getMessages();
    res.render('verify-email',{user:req.user,messages:flashMessages});
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
                'http://'+req.headers.host+'/employers/activateEmail/'+token+'\n\n'
            };
            smtpTransport.sendMail(mailOptions,(err)=>{
             done(err,'done');
            });
        },
    ], 
     (err)=>{
         if(err) {
             req.flash('errorMessage','Mail not sent!');
             res.redirect('/employers/verifyEmail');
             console.log(err);
         }else{
            req.flash('successMessage','Email sent! Check your mail...');
            res.redirect('/employers/verifyEmail');
         }
        
    });
});

router.get('/activateEmail/:token',(req,res)=>{
    Employer.findById(req.user._id,(err,employer)=>{
        if(err){
            console.log(err);
        }else{
            employer.emailVerified = true;

            employer.save(err=>{
                if(err){
                    console.log(err);
                }else{
                   res.redirect('/employers/dashboard');
                }
            })
        }
    })

});


//login-routes:
router.get('/login',(req,res)=>{
    const flashMessages = res.locals.getMessages();
    console.log(flashMessages);
    res.render('index',{student:null,user:null,error:{msg:flashMessages.error}});
});
router.post('/login',passport.authenticate('employer-local',{
    successRedirect:'/employers/dashboard',
    failureRedirect:'/employers/login',
    failureFlash:true
}));

//password reset routes:


router.get('/forgot',(req,res)=>{
    const flashMessages = res.locals.getMessages();
    res.render('forgot',{messages:flashMessages,root:"employers"});
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
            Employer.findOne({username:req.body.username},(err,user)=>{
                if(!user){
                    req.flash('errorMessage','No user is registered with that email!');
                    return res.redirect('/employers/forgot');
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
                'http://'+req.headers.host+'/employers/reset/'+token+'\n\n'+
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
        res.redirect('/employers/forgot');
    });
});

router.get('/reset/:token',(req,res)=>{
    Employer.findOne({resetPasswordToken:req.params.token,resetPasswordExpires:{$gt: Date.now()}},(err,user)=>{
         if(!user){
             req.flash('errorMessage','Token is invalid or has expired.Try again!');
             return res.redirect('/forgot');
         }
         const flashMessages = res.locals.getMessages();
         res.render('reset',{token:req.params.token,messages:flashMessages,root:"employers"});

    });
});

router.post('/reset/:token',(req,res)=>{
    async.waterfall([
        (done)=>{
            Employer.findOne({resetPasswordToken:req.params.token,resetPasswordExpires:{$gt: Date.now()}},(err,user)=>{
                if(!user){
                   req.flash('errorMessage','Token is invalid or has expired.Try again!');                    
                    return res.redirect('/employers/forgot');
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
            res.redirect('/employers/dashboard');
        }
    ]);
});

//logout route:

router.get('/logout',(req,res)=>{
    req.logout();
    res.redirect('/');
});

//==MANAGE ACCOUNT ROUTE==//

router.get('/manage_account',isLoggedIn,(req,res)=>{
    const flashMessages = res.locals.getMessages();
    res.render('manage-account',{messages:flashMessages,user:req.user,student:null});
});

router.post('/manage_account',(req,res)=>{
    Employer.findOne({username:req.user.username},(err,user)=>{
        if(err) console.log(err);
        else{
          //  console.log(validateEmail(req.body.username));
            if(req.body.username === "" || validateEmail(req.body.username) ===false){
                req.flash('errorMessage','Email is invalid!');
                res.redirect('/employers/manage_account');
            }
            else{
                user.username = req.body.username;
                user.firstName = req.body.firstName;
                user.lastName = req.body.lastName;
                user.phoneNumber = req.body.phoneNumber;

                user.save((err)=>{
                    if(err) console.log(err);
                    else{
                        req.logIn(user,(err)=>{
                            if(err) console.log(err);
                            else{
                                req.flash('successMessage','Details updated successfully!');
                                res.redirect('/employers/dashboard');
                            }
                        });
                    }
                });
            }
            
        }
    });
});

//==DELETE ACCOUNT ROUTES==//
router.get('/delete_account',(req,res)=>{
    res.render('delete-account',{user:req.user,student:null});
});

function deletePostedInternships(req,res,next){
    if(req.user.internships.length === 0){
        next();
    }else{
        req.user.internships.forEach(id => {
            Internship.findOneAndRemove({_id:id},(err)=>{
                if(err){
                    console.log(err);
                }
            });
        });
        next();
    }
}

router.delete('/delete_account/:user_id',deletePostedInternships,(req,res)=>{
    Employer.findOneAndRemove({_id:req.user._id},(err)=>{
        if(err){
            console.log(err);
        }else{
            res.sendStatus(200);
        }
    });
});

//dashboard route:
router.get('/dashboard',isLoggedIn,isEmailVerified,(req,res)=>{
    const flashMessages = res.locals.getMessages();
    res.render('employer-dashboard',{student:null,user:req.user,messages:flashMessages});
});

router.post('/dashboard/organization',upload.single('logo'),(req,res)=>{
    var org_name = req.body.org_name;
    var independent = req.body.independent;
    var description = req.body.description;
    var logo;
    if(req.file){
     logo = req.file.filename;
    }else{
        logo="";
    }
    var website = req.body.website;
    var cin = req.body.cin;
    var pan = req.body.pan;
    var gstin = req.body.gstin;
    var facebook = req.body.facebook;
    var linkedin = req.body.linkedin;
    var twitter = req.body.twitter;
    var instagram = req.body.instagram;
    
    Employer.findOne({username:req.user.username},(err,user)=>{
        if(err) console.log(err);
        else{
            var org_details = {
                org_name    : org_name,
                independent : (independent === 'on')?true: false,
                description:description,
                logo:logo,
                website:website,
                cin:cin,
                pan:pan,
                gstin:gstin,
                facebook:facebook,
                linkedin:linkedin,
                twitter:twitter,
                instagram:instagram
            }
            user.org_details = org_details;
            user.save(err=>{
                if(err)console.log(err);
                else{
                    req.flash('successMessage','Organization details updated!');
                    res.redirect('/employers/dashboard');
                }
            });
        }
    });
});

router.get('/view_posted_internships',isLoggedIn,(req,res)=>{
    Internship.find({postedBy:req.user._id},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('view-posted-internships',{student:null,user:req.user,internships:internships});
        }
    });
})

router.get('/close_applications/:id',(req,res)=>{
    Internship.findById(req.params.id,(err,internship)=>{
        if(err){
            console.log(err);
        }else{
            internship.closeApplication = true;
            internship.save(err=>{
                if(err){
                    console.log(err);
                }else{
                    res.redirect('/employers/view_posted_internships');

                }
            });
        }
    });
});

router.get('/post_internship',isLoggedIn,(req,res)=>{
    res.render('post-internships',{student:null,user:req.user});
});


router.post('/post_internship',(req,res)=>{
    var perksArray = ['Certificate','Letter of Recommendation','Informal Dress Code','Flexible Work Hours'];
    for(var i = 0; i<req.body.perks.length; i++){
        if(req.body.perks[i] === 'on'){
            req.body.perks[i] = perksArray[i];
        }
    }
    var newInternship = new Internship({
            category : req.body.category,
            profile:req.body.profile,
            postedBy:req.user._id,
            company_details: req.user.org_details,
            type : req.body.type,
            location:{
                country:req.body.country,
                state: req.body.state,
                city: req.body.city
            },
            part_time:(req.body.part_time === 'yes')?true:false,
            openings:req.body.openings,
            start:req.body.start_date,
            duration:req.body.duration,
            durationScale:req.body.durationScale,
            skills:req.body.skills,
            responsibilities:req.body.responsibilities,
            stipend_type:req.body.stipend_type,
            currency:req.body.currency,
            stipendAmt:req.body.stipendAmt,
            stipendScale:req.body.stipendScale,
            perks:req.body.perks,
            jobOffer:req.body.jobOffer,
            onlyWomen:req.body.onlyWomen,
            question3:req.body.question3,
            question4:req.body.question4,
            applications:[]
        });
        
        newInternship.save((err)=>{
            if(err)console.log(err);
            else{
                Employer.findById(req.user._id,(err,employer)=>{
                    if(err){
                        console.log(err);
                    }else{
                        employer.internships.push(newInternship._id);

                        employer.save(err=>{
                            if(err){
                                console.log(err);
                            }else{
                                req.flash('successMessage','New Internship posted!');
                                res.redirect('/employers/dashboard');
                            }
                        });
                    }
                });
            }
        });
    
});

module.exports=router;