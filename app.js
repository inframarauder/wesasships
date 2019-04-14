//requiring the necessary modules
const express = require('express');
const studentRoute = require('./routes/students');
const empRoute = require('./routes/employers');
const miscRoutes = require('./routes/misc_routes');
const internships = require('./routes/internships');
const premium = require('./routes/premium');
const mongoose = require('mongoose');
const keys = require('./configs/keys');
const bodyParser = require('body-parser');
const path = require('path');
const passport = require('passport');
const passportConfig = require('./configs/passport-config');

//Init the App
const app = express();
//set the view engine & static CSS:
app.set('view engine','ejs');
//middleware setup:
app.use(express.static(path.join(__dirname,'public')));
app.use(bodyParser.urlencoded({extended:false})) ;
app.use(require('express-session')({
    secret:"random secret",
    resave:false,
    saveUninitialized:false
}));
app.use(require('express-flash-messages')());
//home page route
app.get('/',(req,res)=>{
    res.render('index',{student:null,user:null,error:false});
});
passportConfig(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use('/uploads',express.static('uploads'));
app.use('/students',studentRoute);
app.use('/employers',empRoute);
app.use(miscRoutes);
app.use('/internships',internships);
app.use(premium);
//connect to the database(mongoDB-mLab):

mongoose.connect(keys.mongoDB.dbURI,
    {
        useNewUrlParser:true,
        reconnectTries:Number.MAX_VALUE,
        reconnectInterval:1000
    },
    (err)=>{
    if(err)console.log(err);
     else   console.log('connection to database established!');
});

  
//set the port
app.set('port',(process.env.PORT || 3000));

//listen to a server:
app.listen(app.get('port'),()=>{
   console.log("starting application on port...",app.get('port'));
});
