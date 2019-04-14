const express = require('express');
const router = express.Router();
const Internship = require('../models/internship-model');
const Student = require('../models/student-model');
const mongoose = require('mongoose');
//function for filtered search:
function filteredSearch(filters){
    var query = {};
  //  var results = [];
    if(filters.country && filters.state && filters.city){
        query.location = {
            country :filters.country,
            state : filters.state,
            city : filters.city
        }
    }
    if(filters.category){
        query.category = filters.category;
    }
    if(filters.workFromHome === 'on'){
        query.type = 'Work from home';
    }
    if(filters.partTime === 'on'){
        query.part_time = true;
    }
    if(filters.date){
        query.start = {$gte:new Date(filters.date)};
    }
    return query;
}

//get all internships:

router.get('/all_internships',(req,res)=>{
    Internship.find({},null, {sort:{date:-1}},(err,internships)=>{
        if(err) console.log(err);
        else{
            res.render('internships',{internships:internships});
            }
        });
    });

router.post('/all_internships',(req,res)=>{
    var query =  filteredSearch(req.body);
    Internship.find(query,(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});

router.get('/details/',(req,res)=>{
    var id = req.query.id;
    Internship.findById(id,(err,internship)=>{
        if(err){
            console.log(err);
        }else{
            if(req.user && req.user.usertype=== 'student'){
                Student.findById(req.user._id,(err,student)=>{
                    if(err){
                        console.log(err);
                    }else{
                        var alreadyApplied = false;
                        for(var i=0; i<student.internshipsApplied.length; i++){
                            if(student.internshipsApplied[i].equals(id)){
                                alreadyApplied = true;
                                break;
                            }
                        }
                       console.log(alreadyApplied);
                     res.render('internship_view',{internship:internship,user:student,alreadyApplied:alreadyApplied});
                    }
                });
            }else{
                res.render('internship_view',{internship:internship,user:null,alreadyApplied:false});
            }
        }
    });
});

router.post('/',(req,res)=>{
    var searchtext = new RegExp('.*'+req.body.searchtext+'.*','i');
    Internship.find({category:{$regex:searchtext}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});


router.get('/apply/:id',(req,res)=>{
    Internship.findById(req.params.id,(err,internship)=>{
        if(err){
            console.log(err);
        }else{
            res.render('apply-internship',{internship:internship,user:(req.user && req.user.usertype === 'student')?req.user:null});
        }
    });
});


router.post('/apply/:id',(req,res)=>{
    Internship.findById(req.params.id,(err,internship)=>{
        if(err){
            console.log(err);
        }else{
            var application = {
                studentID:req.user._id,
                studentName:req.user.firstName +" "+ req.user.lastName,
                studentEmail:req.user.username,
                applicationNo: Date.now(),
                status:'Applied',
                answer1:req.body.answer1,
                answer2:req.body.answer2,
                answer3:req.body.answer3,
                answer4:req.body.answer4
            };
            internship.applications.push(application);
            internship.save(err=>{
                if(err){
                    console.log(err);
                }else{
                    Student.findById(req.user._id,(err,student)=>{
                        if(err){
                            console.log(err);
                        }else{
                            student.internshipsApplied.push(internship._id);
                            student.save(err=>{
                                if(err){
                                    console.log(err);
                                }else{
                                    res.redirect('/students/dashboard/applications');
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});


//view applications:

router.get('/view_applications/',(req,res)=>{
    Internship.findById(req.query.id,(err,internship)=>{
        if(err){
            console.log(err);
        }else{
            res.render('view-incoming-applications',{internship:internship,applications:internship.applications,user:req.user,student:null});
        }
    });
});

router.get('/applications/application_data/',(req,res)=>{
    var id = req.query.id;
    Internship.findById(id,(err,internship)=>{
        if(err){
            console.log(err);
        }else{
            var applicationData = internship.applications.find((application)=>{
                return (application.studentID.equals(req.user._id));
            });
            console.log(applicationData);
            
            res.json({
                date:applicationData.applicationNo,
                internshipid:internship._id,
                profile:internship.profile,
                status:applicationData.status,
                company:internship.company_details.org_name
            });
        }
    });
});


//view specific application:
router.get('/applications/',(req,res)=>{
    var id = req.query.id;
    var appNo = req.query.appNo;
    Internship.findById(id,(err,internship)=>{
        if(err){
            console.log(err);
        }else{
            var applicationData = internship.applications.find((application)=>{
                return (application.applicationNo === Number(appNo));
            });
         //   console.log(applicationData);
            Student.findById(applicationData.studentID,(err,student)=>{
                if(err){
                    console.log(err);
                }else{
                    res.render('application',{internship:internship,application:applicationData,student:student,user:req.user,applying:true});
                }
            });
        }
    });
});

router.get('/applications/decision/',(req,res)=>{
    var id = req.query.id;
    var appNo = req.query.appNo;
    var status = req.query.status;

    Internship.findById(id,(err,internship)=>{
        if(err){
            console.log(err);
        }else{
           var application = internship.applications.find(application=>{
                return (application.applicationNo === Number(appNo));                
            });

            var changedApplication = application;
            changedApplication.status = status;
            console.log(changedApplication);

            var index = internship.applications.indexOf(application);

            internship.applications.splice(index,1,changedApplication);

            internship.save(err=>{
                if(err){
                    console.log(err);
                }else{
                    res.redirect('/internships/applications/?id='+id+'&appNo='+appNo);
                }
            });
        }
    });
});


//internships by places:

router.get('/Delhi',(req,res)=>{
    Internship.find({'location.city':'Delhi'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }

    });
});


router.get('/Kolkata',(req,res)=>{
    Internship.find({'location.city':'Kolkata'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }

    });
});


router.get('/Mumbai',(req,res)=>{
    Internship.find({'location.city':'Mumbai'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }

    });
});


router.get('/Chennai',(req,res)=>{
    Internship.find({'location.city':'Chennai'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }

    });
});


router.get('/Bangalore',(req,res)=>{
    Internship.find({'location.city':'Bangalore'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }

    });
});


router.get('/Hyderabad',(req,res)=>{
    Internship.find({'location.city':'Hyderabad'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }

    });
});


//international :

router.get('/International',(req,res)=>{
    Internship.find({'location.country':{$ne:'India'}},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});

//work-from-home:

router.get('/work-from-home',(req,res)=>{
    Internship.find({type:'Work from home'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }

    });
});


//part-time-internships:

router.get('/Part-time',(req,res)=>{
    Internship.find({part_time:true},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }

    });
});

//internships with job offer:

router.get('/JobOffer',(req,res)=>{
    Internship.find({jobOffer:true},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});


//internships for women only:

router.get('/Women',(req,res)=>{
    Internship.find({onlyWomen:true},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});


//internships by category:

router.get('/Engineering',(req,res)=>{
    Internship.find({category:'Engineering'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});


router.get('/MBA',(req,res)=>{
    Internship.find({category:'MBA'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});


router.get('/Science',(req,res)=>{
    Internship.find({category:'Science'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});


router.get('/Humanities',(req,res)=>{
    Internship.find({category:'Humanities'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});


router.get('/Law',(req,res)=>{
    Internship.find({category:'Law'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});


router.get('/GraphicsDesign',(req,res)=>{
    Internship.find({category:'Graphics Design'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});


router.get('/VideoEditing',(req,res)=>{
    Internship.find({category:'Video Editing'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});


router.get('/Architecture',(req,res)=>{
    Internship.find({category:'Architecture'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});

router.get('/Media',(req,res)=>{
    Internship.find({category:'Media'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});

router.get('/Entertainment',(req,res)=>{
    Internship.find({category:'Entertainment'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});

router.get('/Hospitality',(req,res)=>{
    Internship.find({category:'Hospitality'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});

router.get('/Sports',(req,res)=>{
    Internship.find({category:'Sports'},null,{sort:{date:-1}},(err,internships)=>{
        if(err){
            console.log(err);
        }else{
            res.render('internships',{internships:internships});
        }
    });
});
module.exports = router;