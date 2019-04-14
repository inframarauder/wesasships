const express = require('express');
const router = express.Router();

router.get('/aboutus',(req,res)=>{
    res.render('about-us');
});

router.get('/team',(req,res)=>{
    res.render('team');
});

router.get('/terms',(req,res)=>{
    res.render('terms-conditions',{type:'terms'}); 
});

router.get('/services',(req,res)=>{
    res.render('terms-conditions',{type:'services'});
});

router.get('/contact',(req,res)=>{
    res.render('contact-us');
});

router.get('/privacy',(req,res)=>{
    res.render('terms-conditions',{type:'privacy'});
});

module.exports=router;