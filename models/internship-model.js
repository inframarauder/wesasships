const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InternshipSchema = new Schema({
    category:String,
    profile:String,
    postedBy:String,
    applications:Array,
    company_details:Object,
    type:String,
    location:Object,
    part_time: Boolean,
    openings:Number,
    start:Date,
    duration: Number,
    durationScale:String,
    skills:String,
    responsibilities:String,
    currency:String,
    stipendAmt:String,
    stipendScale:String,
    perks:Array,
    jobOffer:Boolean,
    onlyWomen:Boolean,
    question3:String,
    question4:String,
    closeApplication:{type:Boolean,default:false}
});

module.exports = mongoose.model('Internship',InternshipSchema);