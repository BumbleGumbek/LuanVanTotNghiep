var express = require('express');
var router = express.Router();
const Product = require("../models/Product");
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const { deductInventory } = require("../helpers/inventory-helper");
const { createOrder } = require("../helpers/order-helper");
const Coupon = require('../models/Coupon');
const {getCartItems, calculateCartSummary} = require("../helpers/cart-helper");

router.use((req, res, next) => {
    res.app.locals.layout = 'home';
    next();
});

router.get('/shopping-cart', async function(req, res, next){
    try {
        const cartItems =
            await getCartItems(req);
        const {
            totalPrice,
            totalQty
        } = calculateCartSummary(cartItems);

        res.render('home/shopping-cart', {
            title: 'cart',
            product: cartItems,
            totalPrice,
            totalQty
        });
    } catch (error) {
        next(error);
    }
});

router.post('/add-cart/:id', async function(req, res, next){
    try {
        const productId = req.params.id;
        const size = req.body.size;
        let qty = parseInt(req.body.qty) || 1;
        const action = req.body.action;

        if (!size) {
            req.flash('error_message', 'Please select a size first.');
            return res.redirect('back');
        }

        const product = await Product.findById(productId);
        if (!product) return res.status(404).send('Product not found');

        const variant = product.variants.find(v => v.size == size);
        if (!variant || variant.quantity <= 0) {
            req.flash('error_message', 'Selected size is out of stock.');
            return res.redirect('back');
        }

        // Đảm bảo số lượng thêm hợp lệ và không vượt quá tồn kho của size được chọn
        if (qty <= 0) qty = 1;
        if (qty > variant.quantity) {
            qty = variant.quantity;
        }

        if (req.isAuthenticated()) {
            let dbCart = await Cart.findOne({ user_id: req.user._id });
            if (!dbCart) {
                dbCart = new Cart({ user_id: req.user._id, items: [] });
            }

            let existingItem = dbCart.items.find(item => item.product_id.toString() === productId && item.size == size);
            if (existingItem) {
                existingItem.quantity = (existingItem.quantity + qty > variant.quantity) ? variant.quantity : existingItem.quantity + qty;
            } else {
                dbCart.items.push({ product_id: productId, size: size, quantity: qty });
            }
            await dbCart.save();
        } else {
            if(!req.session.cart) req.session.cart = [];
            let cart = req.session.cart;
            let existingProduct = cart.find(item => item.product_id == productId && item.size == size);

            if (existingProduct) {
                existingProduct.quantity = (existingProduct.quantity + qty > variant.quantity) ? variant.quantity : existingProduct.quantity + qty;
                existingProduct.total = existingProduct.quantity * product.price;
            } else {
                qty = (qty > variant.quantity) ? variant.quantity : qty;
                cart.push({
                    product_id: product._id.toString(),
                    name: product.name,
                    image: product.image,
                    price: product.price,
                    quantity: qty,
                    size: size,
                    total: product.price * qty
                });
            }
        }

        if (action === 'buy_now') {
            req.session.buyNowItem = {
                product_id: product._id.toString(),
                name: product.name,
                image: product.image,
                price: product.price,
                quantity: qty,
                size: size,
                total: product.price * qty
            };

            if (!req.isAuthenticated()) {
                req.session.oldUrl = '/checkout';
                return res.redirect('/login');
            }
            return res.redirect('/checkout');
        } else {
            res.redirect('/shopping-cart');
        }
    } catch (error) {
        next(error);
    }
});

router.get('/remove-cart/:id', async function(req, res, next){
    try {
        const productId = req.params.id.toString();
        const size = req.query.size ? req.query.size.toString() : "";

        if (req.isAuthenticated()) {
            let dbCart = await Cart.findOne({ user_id: req.user._id });
            if (dbCart) {
                dbCart.items = dbCart.items.filter(item => {
                    const itemProductId = (item.product_id && item.product_id._id)
                        ? item.product_id._id.toString()
                        : item.product_id.toString();
                    const itemSize = item.size ? item.size.toString() : "";
                    return !(itemProductId === productId && itemSize === size);
                });
                await dbCart.save();
            }
        } else {
            if(req.session.cart){
                req.session.cart = req.session.cart.filter(item => {
                    const itemProductId = (item.product_id && item.product_id._id)
                        ? item.product_id._id.toString()
                        : (item.product_id ? item.product_id.toString() : "");
                    const itemSize = item.size ? item.size.toString() : "";
                    return !(itemProductId === productId && itemSize === size);
                });
            }
        }
        res.redirect('/shopping-cart');
    } catch (error) {
        next(error);
    }
});


router.post('/update-cart', async function(req, res, next){
    try {
        const quantities = req.body.quantities;
        if(!quantities) return res.redirect('/shopping-cart');

        if (req.isAuthenticated()) {
            let dbCart = await Cart.findOne({ user_id: req.user._id });
            if (dbCart) {
                const productIds = dbCart.items.map(item => item.product_id);
                const products = await Product.find({ _id: { $in: productIds } });

                for (let item of dbCart.items) {
                    const key = `${item.product_id}_${item.size}`;
                    if (!quantities[key]) continue;

                    let newQty = parseInt(quantities[key]);
                    if (newQty <= 0) continue;

                    const product = products.find(p => p._id.toString() === item.product_id.toString());
                    if (product) {
                        const variant = product.variants.find(v => v.size == item.size);
                        if(variant) {
                            item.quantity = (newQty > variant.quantity) ? variant.quantity : newQty;
                        }
                    }
                }
                await dbCart.save();
            }
        } else {
            if(req.session.cart && req.session.cart.length > 0){
                const productIds = req.session.cart.map(item => item.product_id);
                const products = await Product.find({ _id: { $in: productIds } });

                for(let item of req.session.cart){
                    const key = `${item.product_id}_${item.size}`;
                    if (!quantities[key]) continue;

                    let newQty = parseInt(quantities[key]);
                    if (newQty <= 0) continue;

                    const product = products.find(p => p._id.toString() === item.product_id.toString());
                    if (product) {
                        const variant = product.variants.find(v => v.size == item.size);
                        if (variant) {
                            item.quantity = (newQty > variant.quantity) ? variant.quantity : newQty;
                            item.total = item.price * item.quantity;
                        }
                    }
                }
            }
        }
        res.redirect('/shopping-cart');
    } catch (error) {
        next(error);
    }
});

router.get('/checkout', async function(req, res, next){
    try {
        if (!req.isAuthenticated()) {
            req.session.oldUrl = '/checkout';
            req.flash('error_message', 'Please login or create an account to make a payment.');
            return res.redirect('/login');
        }

        let totalPrice = 0;
        let totalQty = 0;
        let cartItems = [];

        if (req.session.buyNowItem) {
            let item = req.session.buyNowItem;
            totalPrice = item.total;
            totalQty = item.quantity;
            cartItems.push({
                product_id: item.product_id,
                name: item.name,
                image: item.image,
                price: item.price,
                quantity: item.quantity,
                size: item.size,
                total: item.total
            });
        } else {

            cartItems = await getCartItems(req);
            if (cartItems.length <= 0) {

                req.flash(
                    'error_message',
                    'Your shopping cart is empty.'
                );
                return res.redirect('/shopping-cart');
            }
            const summary =
                calculateCartSummary(cartItems);

            totalPrice = summary.totalPrice;
            totalQty = summary.totalQty;
        }

        res.render('home/checkout', {
            title: 'Checkout',
            product: cartItems,
            totalPrice: totalPrice,
            totalQty: totalQty,
            activePage: 'checkout'
        });

    } catch (error) {
        next(error);
    }
});

router.post('/checkout', async function(req, res, next){
    if (!req.isAuthenticated()) return res.status(401).redirect('/login');
    try {
        const { receiverName, receiverPhone, detailAddress, note, couponCode } = req.body;
        if (
            !receiverName ||
            !receiverPhone ||
            !detailAddress
        ) {
            req.flash(
                'error_message',
                'Please fill in all required shipping fields.'
            );
            return res.redirect('/checkout');
        }
        let checkoutItems = [];
        let totalPrice = 0;
        let isBuyNow = false;

        // Kiểm tra xem có hàng Mua Ngay không
        if (req.session.buyNowItem) {
            let item = req.session.buyNowItem;
            checkoutItems.push({
                product_id: item.product_id,
                name: item.name,
                image: item.image,
                price: item.price,
                size: item.size,
                quantity: item.quantity
            });
            totalPrice = item.total;
            isBuyNow = true;
        } else {
            // Nếu không, đọc từ Giỏ hàng Database gốc
            const dbCart = await Cart.findOne({ user_id: req.user._id }).populate('items.product_id');
            if(!dbCart || !dbCart.items || dbCart.items.length <= 0) {
                return res.redirect('/shopping-cart');
            }
            dbCart.items.forEach(item => {
                let p = item.product_id;
                if (p) {
                    totalPrice += (p.price * item.quantity);
                    checkoutItems.push({
                        product_id: p._id,
                        name: p.name,
                        image: p.image,
                        price: p.price,
                        size: item.size,
                        quantity: item.quantity
                    });
                }
            });
        }
        let coupon = null;

        if (couponCode && couponCode.trim() !== '') {

            coupon = await Coupon.findOne({
                code: couponCode.trim().toUpperCase(),
                status: true
            });

            if (!coupon) {
                req.flash('error_message', 'Invalid coupon code.');
                return res.redirect('/checkout');
            }

            if (coupon.expiryDate < new Date()) {
                req.flash('error_message', 'Coupon has expired.');
                return res.redirect('/checkout');
            }

            if (coupon.usedCount >= coupon.usageLimit) {
                req.flash('error_message', 'Coupon usage limit reached.');
                return res.redirect('/checkout');
            }

            if (totalPrice < coupon.minOrderValue) {
                req.flash(
                    'error_message',
                    `Minimum order value is ${coupon.minOrderValue.toLocaleString()} VND`
                );
                return res.redirect('/checkout');
            }

            totalPrice = Math.max(
                totalPrice - coupon.discountValue,
                0
            );
        }

        console.log(req.body);
        const newOrder = await createOrder({
            userId: req.user._id,
            receiverName,
            receiverPhone,
            detailAddress,
            checkoutItems,
            totalPrice,
            couponId: coupon ? coupon._id : null,
            note
        });

        if (isBuyNow) {
            delete req.session.buyNowItem;
        } else {
            await Cart.deleteOne({ user_id: req.user._id });
        }

        req.flash('success_message', 'Your order has been placed successfully!');
        res.redirect('/payment/' + newOrder._id);
    } catch (error) {
        console.error("ERROR WHEN SAVING ORDERS TO MONGO:", error);
        next(error);
    }
});

module.exports = router;