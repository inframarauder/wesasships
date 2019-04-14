const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SkillSchema = new Schema({
    skill:String,
    questions:Array
});

module.exports = mongoose.model('Skill',SkillSchema);