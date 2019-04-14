const Student = require('../models/student-model');
const Employer = require('../models/employer-model');
const keys = require('../configs/keys');
const LocalStrategy = require('passport-local');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

module.exports=(passport)=>{
    //==SERIALIZE USERS HERE==//
    passport.serializeUser((user,done)=>{
        var key = {
            id: user.id,
            type: user.usertype
          }
          done(null, key);
    });
    passport.deserializeUser((key,done)=>{
        var Model = key.type === 'student' ? Student : Employer; 
      Model.findOne({
        _id: key.id
      }, '-salt -password', function(err, user) {
        done(err, user);
      });
    });

    //==STRATEGIES GO HERE==//
    passport.use(new GoogleStrategy(
        {
            clientID:keys.google.clientID,
            clientSecret:keys.google.clientSecret,
            callbackURL:keys.google.callbackURL
        },
        function(accessToken,refreshToken,profile,done){
          //  console.log(profile);
           var firstName = profile.name.givenName;
           var lastName = profile.name.familyName;
            var email= profile.emails[0].value;
            Student.findOne({username:email},(err,user)=>{
                if(err)return done(err,null);
                if(user) return done(null,user);
                else{
                    var newStudent = new Student();
                    newStudent.username=email;
                    newStudent.firstName= firstName;
                    newStudent.lastName = lastName;
                    newStudent.usertype = "student";
                    newStudent.emailVerified = true;
                    newStudent.save((err)=>{
                        if(err)throw err;
                        return done(null,newStudent);
                    });
                }
            });
        }
    ));
    
    passport.use('student-local',new LocalStrategy( Student.authenticate() ));
    passport.use('employer-local',new LocalStrategy( Employer.authenticate() ));
};