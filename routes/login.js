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

        req.logIn(user, async (err) => { // Thêm async ở đây để xử lý gọi DB
            if (err) return next(err);

            // 2. Khôi phục lại giỏ hàng và vật phẩm mua ngay sau khi login thành công
            if (cartBackup) {
                req.session.cart = cartBackup;
            }
            if (buyNowBackup) {
                req.session.buyNowItem = buyNowBackup;
            }

            // 3. LOGIC MỚI: Tiến hành gộp giỏ hàng Session vào DB cho khách hàng
            try {
                await mergeSessionCartToDb(
                    req.session.cart,
                    user._id
                );

                delete req.session.cart;
            } catch (mergeErr) {
                console.error("Lỗi khi gộp giỏ hàng tại login.js:", mergeErr);
                // Vẫn cho chạy tiếp luồng thanh toán nếu lỗi gộp để không làm gián đoạn trải nghiệm của khách
            }

            // 4. Điều hướng thông minh (Giữ nguyên gốc của bà)
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



router.get('/logout', function(req, res, next){
    req.logout(function(err){
        if(err){
            return next(err);
        }
        res.redirect('/');
    });
});

module.exports = router;
