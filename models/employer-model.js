const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const EmployerSchema = new Schema({
    username:String,
    emailVerified:{type:Boolean,default:false},
    phoneString:String,
    firstName:String,
    lastName :String,
    password: String,
    usertype:String,
    resetPasswordToken:String,
    resetPasswordExpires:Date,
    org_details:{type:Object,default:null},
    internships:{type:Array,default:[]}
});
EmployerSchema.plugin(passportLocalMongoose);
//create the employer model:
module.exports= mongoose.model('Employer',EmployerSchema);
