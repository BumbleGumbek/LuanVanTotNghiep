var express = require('express');
var router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
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
                if (req.session.cart && req.session.cart.length > 0) {
                    let dbCart = await Cart.findOne({ user_id: user._id });
                    if (!dbCart) {
                        dbCart = new Cart({ user_id: user._id, items: [] });
                    }

                    // Duyệt qua từng món hàng trong session để đổ vào DB
                    for (let sessionItem of req.session.cart) {
                        let existingItem = dbCart.items.find(item =>
                            item.product_id.toString() === sessionItem.product_id && item.size == sessionItem.size
                        );

                        if (existingItem) {
                            // Nếu trùng sản phẩm + trùng size thì cộng dồn (nhưng không vượt quá kho thực tế)
                            const product = await Product.findById(sessionItem.product_id);
                            if (product) {
                                const variant = product.variants.find(v => v.size == sessionItem.size);
                                if (variant) {
                                    let maxQty = variant.quantity;
                                    existingItem.quantity = (existingItem.quantity + sessionItem.quantity > maxQty)
                                        ? maxQty
                                        : existingItem.quantity + sessionItem.quantity;
                                }
                            }
                        } else {
                            // Nếu chưa có món này trong DB thì nạp mới vào mảng
                            dbCart.items.push({
                                product_id: sessionItem.product_id,
                                size: sessionItem.size,
                                quantity: sessionItem.quantity
                            });
                        }
                    }

                    // Lưu giỏ hàng mới cập nhật xuống MongoDB
                    await dbCart.save();

                    // Xóa giỏ hàng session cũ để tránh gộp lặp lại ở lần sau
                    delete req.session.cart;
                }
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
