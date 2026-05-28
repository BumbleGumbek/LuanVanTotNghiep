var express = require('express');
var router = express.Router();
const User = require("../models/User");
const bcryptjs = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
function useAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next(); // Proceed if authenticated
    } else {
        res.redirect('/register'); // Redirect to login if authentication fails
    }
}

router.all('/*', function (req,res,next) {
    res.app.locals.layout = 'register';
    next();
})

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('register/index', { title: 'Login' });
});

router.post('/', (req, res, next) => {

    let errors = [];
    if (!req.body.firstName) {
        errors.push({message: 'First name is required 1'});
    }
    if (!req.body.lastName) {
        errors.push({message: 'Last name is required'});
    }
    if (!req.body.email) {
        errors.push({message: 'E-mail is required'});
    }

    if (errors.length > 0) {
        res.render('home/register', {
            title: 'Register',
            errors: errors,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: req.body.password
        });
    } else {
        User.findOne({email: req.body.email}).then((user) => {
            if (!user) {
                const newUser = new User({
                    email: req.body.email,
                    password: req.body.password,
                    firstName: req.body.firstName,
                    lastName: req.body.lastName,
                });
                bcryptjs.genSalt(10, function (err, salt) {
                    bcryptjs.hash(newUser.password, salt, (err, hash) => {
                        newUser.password = hash;
                        newUser.save().then(saveUser => {
                            req.flash('success_message', 'Successfully registered!');
                            res.redirect('/login');//or /login
                        });
                    })
                })
            } else {
                req.flash('error_message', 'E-mail is exist!');
                res.redirect('/login');
            }

        });

    }
});



module.exports = router;
