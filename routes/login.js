var express = require('express');
var router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const passport = require('passport');

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

            if (user.role === 'admin') {
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
