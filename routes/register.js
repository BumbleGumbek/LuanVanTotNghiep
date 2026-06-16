var express = require('express');
var router = express.Router();
const User = require("../models/User");
const bcryptjs = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

function useAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/register');
    }
}

router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'register';
    next();
});

/* GET home page. */
router.get('/', async function(req, res, next) {
    try {
        res.render('register/index', { title: 'Login' });
    } catch (err) {
        next(err);
    }
});

router.post('/', async function (req, res, next) {
    try {
        let errors = [];
        if (!req.body.firstName) {
            errors.push({ message: 'First name is required' });
        }
        if (!req.body.lastName) {
            errors.push({ message: 'Last name is required' });
        }
        if (!req.body.email) {
            errors.push({ message: 'E-mail is required' });
        }
        if (!req.body.phone) {
            errors.push({
                message: 'Phone number is required'
            });
        }
        if (req.body.password !== req.body.confirmPassword) {
            errors.push({
                message: 'Passwords do not match'
            });
        }
        if (!req.body.address) {
            errors.push({
                message: 'Address is required'
            });
        }
        if (errors.length > 0) {

            return res.render(
                'register/index',
                {
                    title: 'Register',
                    errors,
                    firstName: req.body.firstName,
                    lastName: req.body.lastName,
                    email: req.body.email,
                    phone: req.body.phone,
                    address: req.body.address,
                    password: req.body.password
                }
            );
        }

        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            const newUser = new User({
                email: req.body.email,
                password: req.body.password,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                phone: req.body.phone,
                address: req.body.address,
            });

            const salt = await bcryptjs.genSalt(10);
            const hash = await bcryptjs.hash(newUser.password, salt);

            newUser.password = hash;
            await newUser.save();

            req.flash('success_message', 'Successfully registered!');
            return res.redirect('/login');
        } else {
            req.flash('error_message', 'E-mail already exists!');
            return res.redirect('/login');
        }
    } catch (err) {
        console.error("Error during member registration:", err);
        next(err);
    }
});

module.exports = router;