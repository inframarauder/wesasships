const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const StudentSchema = new Schema({
    username:String,
    emailVerified:{type:Boolean,default:false},
    phoneNumber:String,
    firstName:String,
    lastName :String,
    password: String,
    city:String,
    usertype:String,
    resetPasswordToken:String,
    resetPasswordExpires:Date,
    education:Object,
    skills:Array,
    trainings:Array,
    projects:Array,
    work_experience:Array,
    achievements:Array,
    internshipsApplied:Array,
    premium_user:{type:Boolean,default:false}
});

StudentSchema.plugin(passportLocalMongoose);

//create the student model:
module.exports= mongoose.model('Student',StudentSchema);
