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
        res.redirect('/login');
    }
}

router.all('/*', function (req,res,next) {
    res.app.locals.layout = 'login';
    next();
})

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('login/index', { title: 'Login' });
});

passport.use(new LocalStrategy({usernameField: 'email'}, function (email, password, done) {
    User.findOne({email: email}).then(user => {
        if (!user)
            return done(null, false, {message: 'users not found'});

        bcryptjs.compare(password, user.password, (err, matched) => {
            if (err) return err;
            if (matched) {
                return done(null, user);
            } else {
                return done(null, false, {message: 'Wrong email or password'});
            }
        });

    });
}));
router.post('/', (req, res, next) => {
    // 1. Sao lưu giỏ hàng trước khi Passport tái tạo session
    const cartBackup = req.session.cart;
    const buyNowBackup = req.session.buyNowItem;
    const oldUrl = req.session.oldUrl;

    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            req.flash('error_message', info.message);
            return res.redirect('/login');
        }
        
        req.logIn(user, (err) => {
            if (err) return next(err);

            // 2. Khôi phục lại giỏ hàng sau khi login thành công
            if (cartBackup) {
                req.session.cart = cartBackup;
            }
            if (buyNowBackup) {
                req.session.buyNowItem = buyNowBackup;
            }

            // 3. Điều hướng thông minh
            if (user.role === 'admin') {
                return res.redirect('/admin');
            }

            if (oldUrl) {
                delete req.session.oldUrl;
                return res.redirect(oldUrl);
            }

            res.redirect('/');
        });
    })(req, res, next);
});
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).exec();
        done(null, user); // Pass the users to the done callback
    } catch (err) {
        done(err);
    }
});

router.get('/logout', function(req, res, next){
    req.logout(function(err){
        if(err){
            return next(err);
        }
        res.redirect('/');
    });
});

module.exports = router;
