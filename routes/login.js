var express = require('express');
var router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
    sendResetPasswordEmail
} = require('../helpers/mail-helper');

const {
    mergeSessionCartToDb
} = require('../helpers/cart-merge-helper');

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

router.get('/forgot-password', function(req, res) {
    res.render('login/forgot-password', {
        title: 'Forgot Password'
    });
});
router.post('/forgot-password', async function(req, res, next) {
    try {
        const { email } = req.body;
        const user = await User.findOne({
            email
        });
        if (!user) {
            req.flash(
                'error_message',
                'Email does not exist.'
            );
            return res.redirect('/login/forgot-password');
        }
        const token = crypto
            .randomBytes(32)
            .toString('hex');

        user.resetPasswordToken = token;

        user.resetPasswordExpire =
            Date.now() + 15 * 60 * 1000;

        await user.save();
        const appUrl =
            process.env.APP_URL ||
            `${req.protocol}://${req.get('host')}`;
        const resetLink =
            `${appUrl}/login/reset-password/${token}`;
        await sendResetPasswordEmail(
            user,
            resetLink
        );
        req.flash(
            'success_message',
            'Password reset email has been sent.'
        );
        return res.redirect('/login/forgot-password');

    } catch(err) {
        next(err);
    }
});
router.get('/reset-password/:token', async function(req, res, next) {
    try {

        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpire: {
                $gt: Date.now()
            }
        });

        if (!user) {
            req.flash(
                'error_message',
                'Reset link is invalid or has expired.'
            );

            return res.redirect('/login');
        }

        res.render(
            'login/reset-password',
            {
                title: 'Reset Password',
                token: req.params.token
            }
        );

    } catch(err) {
        next(err);
    }
});

router.post('/reset-password/:token', async function(req, res, next) {
    try {

        const { password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            req.flash('error_message', 'Passwords do not match.');
            return res.redirect('/login/reset-password/' + req.params.token);
        }

        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpire: {
                $gt: Date.now()
            }
        });

        if (!user) {
            req.flash('error_message', 'Reset link has expired.');
            return res.redirect('/login');
        }

        const hash = await bcrypt.hash(password, 10);

        user.password = hash;
        user.resetPasswordToken = null;
        user.resetPasswordExpire = null;

        await user.save();

        req.flash(
            'success_message',
            'Password changed successfully.'
        );

        return res.redirect('/login');

    } catch(err){
        next(err);
    }
});

router.post('/', (req, res, next) => {
    const cartBackup = req.session.cart;
    const buyNowBackup = req.session.buyNowItem;
    const oldUrl = req.session.oldUrl;

    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            req.flash('error_message', info.message);
            return res.redirect('/login');
        }
        req.logIn(user, async (err) => {
            if (err) return next(err);
            if (cartBackup) {
                req.session.cart = cartBackup;
            }
            if (buyNowBackup) {
                req.session.buyNowItem = buyNowBackup;
            }
            try {
                await mergeSessionCartToDb(
                    req.session.cart,
                    user._id
                );
                delete req.session.cart;
            } catch (mergeErr) {
                console.error("Error", mergeErr);
            }
            if (
                ['admin', 'store_manager', 'warehouse'].includes(user.role)
            ) {
                return res.redirect('/admin');
            }
            if (user.role === 'supplier') {
                return res.redirect('/supplier/import-request');
            }
            if (oldUrl) {
                delete req.session.oldUrl;
                return res.redirect(oldUrl);
            }
            res.redirect('/');
        });
    })(req, res, next);
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
