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

/* POST Xử lý Đăng ký tài khoản thành viên */
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

        if (errors.length > 0) {
            return res.render('home/register', {
                title: 'Register',
                errors: errors,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                password: req.body.password
            });
        }

        // Kiểm tra Email xem trùng lặp hay không bằng await
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            const newUser = new User({
                email: req.body.email,
                password: req.body.password,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
            });

            // Tiến hành băm mật khẩu bảo mật
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
        console.error("Lỗi trong quá trình đăng ký thành viên:", err);
        next(err);
    }
});

module.exports = router;