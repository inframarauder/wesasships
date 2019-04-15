const express = require('express');
const router  = express.Router();
const payumoney = require('payumoney-node');


//configure payumoney:
payumoney.setKeys('122vRI7i','ew6lARLvIw','QtlDdYR5Zy1r0vD5leimBZ5UHxbL0HC1aT7pnqmUfVY=');
payumoney.isProdMode(false);
var txnid = new Date().getTime();

function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    else{
        res.redirect('/students/login');
    }
}
router.get('/premium_profile',isLoggedIn,(req,res)=>{
    res.render('premium',{student:req.user});
});

router.post('/premium_profile',isLoggedIn,(req,res)=>{
  //  console.log(req.body);
    var paymentData = {
        productinfo: "premium profile",
        txnid: txnid,
        amount: "499",
        email: req.body.email,
        phone: req.body.phone,
        lastname: req.body.lastName,
        firstname: req.body.firstName,
        surl: "http://www.wesasships.com/students/dashboard", 
        furl: "http://www.wesasships.com/premium_profile"/*,
       /enforce_paymethod:['CC','DC','UPI','CASHCARD']*/
    };
    //console.log(paymentData);
    payumoney.makePayment(paymentData, function(error, response) {
        console.log('making payment...');
        if (error) {
          console.log(error);
        } else {
                console.log(response);
                res.redirect(response);       
            }
      });
});

module.exports = router;
