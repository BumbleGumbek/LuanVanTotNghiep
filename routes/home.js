var express = require('express');
var router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const Wishlist = require('../models/Wishlist');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const bcryptjs = require('bcryptjs');
const payos = require('../config/payos');

router.use((req, res, next) => {
  res.app.locals.layout = 'home';
  next();
});

router.get('/', async function(req, res, next) {
  try {
    const products = await Product.find({ 'variants.quantity': { $gt: 0 } }).sort({ createdAt: -1 }).limit(9);

    let wishlistProductIds = [];
    if (req.user) {
      const wishlist = await Wishlist.find({ user: req.user._id });
      wishlistProductIds = wishlist.map(w => w.product.toString());
    }

    const plainProduct = products.map(p => {
      const productObj = p.toObject();
      productObj.inWishlist = wishlistProductIds.includes(productObj._id.toString());
      return productObj;
    });

    res.render('home/index', {
      plainProduct: plainProduct,
      activePage: 'home',
      isHome: true
    });
  } catch (err) {
    next(err);
  }
});

router.get('/logout', (req, res) => {
  req.logOut((err) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.redirect('/');
  });
});


router.get('/product-detail/:id', async function (req, res, next) {
  try {
    const product = await Product.findOne({_id: req.params.id}).populate('category');
    if (!product) return res.status(404).send('Product not found');

    let relatedProductsRaw = [];
    if (product.category && product.category._id) {
      relatedProductsRaw = await Product.find({
        _id: {$ne: product._id},
        category: product.category._id,
        'variants.quantity': { $gt: 0 }
      }).populate('category').limit(4);
    }


    let wishlistProductIds = [];
    if (req.user) {
      const wishlist = await Wishlist.find({ user: req.user._id });
      wishlistProductIds = wishlist.map(w => w.product.toString());
    }

    const productObj = product.toObject();
    productObj.inWishlist = wishlistProductIds.includes(productObj._id.toString());

    // Kiểm tra variants trước khi reduce để tránh lỗi nếu variants rỗng
    productObj.totalQuantity = productObj.variants ? productObj.variants.reduce((sum, item) => sum + item.quantity, 0) : 0;

    const relatedProducts = relatedProductsRaw.map(p => {
      const pObj = p.toObject();
      pObj.inWishlist = wishlistProductIds.includes(pObj._id.toString());
      return pObj;
    });

    res.render('home/product-detail', {
      title: 'Detail',
      product: productObj,
      relatedProducts: relatedProducts,
      activePage: 'jewelry'
    });
  } catch (err) {
    next(err);
  }
});


router.get('/about', function(req, res, next) {
  res.render('home/about', { title: 'About', activePage: 'about' });
});

router.get('/contact', function(req, res, next) {
  res.render('home/contact', { title: 'Contact', activePage: 'contact' });
});

router.get('/my-orders', async (req, res, next) => {
  if(!req.isAuthenticated()){
    req.flash('error_message', 'Please login to view your orders');
    return res.redirect('/login');
  }
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.render('home/my-orders', {
      title: 'My Orders',
      orders: orders.map(order => order.toObject()),
      activePage: 'orders'
    });
  } catch (err) {
    next(err);
  }
});

router.get('/my-orders/:id', async function(req, res, next) {
  try {
    if (!req.isAuthenticated()) return res.redirect('/login');

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!order) {
      req.flash('error_message', 'Cannot find your order.');
      return res.redirect('/my-orders');
    }

    const plainOrder = order.toObject();

    plainOrder.items = plainOrder.items.map(item => ({
      ...item,
      subtotal: item.price_at_purchase * item.quantity
    }));

    res.render('home/my-orders-detail', {
      order: plainOrder,
      activePage: 'orders'
    });

  } catch (err) {
    next(err);
  }
});

router.post('/cancel-order/:id', async function(req, res, next) {
  try {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order || order.status !== 'PendingPayment') {
      req.flash('error_message', 'Order not found or cannot be cancelled.');
      return res.redirect('/my-orders');
    }
    order.status = 'Cancelled';
    order.paymentStatus = 'Failed';
    await order.save();

    for (let item of order.items) {
      await Product.findOneAndUpdate(
          { _id: item.product_id, "variants.size": item.size },
          { $inc: { "variants.$.quantity": item.quantity, sold: -item.quantity } }
      );
    }
    req.flash('success_message', 'Order has been cancelled successfully.');
    res.redirect('/my-orders/' + order._id);
  } catch (err) {
    next(err);
  }
});


router.get('/jewelry', async function(req, res, next) {
  try {
    const categorySlug = req.query.cat;
    let filter = { 'variants.quantity': { $gt: 0 } };
    if (categorySlug) {
      const category = await Category.findOne({
        name: {
          $regex: new RegExp(categorySlug, "i")
        }
      });
      if (category) filter.category = category._id;
    }

    const products = await Product.find(filter).populate('category');
    let wishlistProductIds = [];
    if (req.user) {
      const wishlist = await Wishlist.find({ user: req.user._id });
      wishlistProductIds = wishlist.map(w => w.product.toString());
    }
    res.render('home/index', {
      plainProduct: products.map(p => {
        const pObj = p.toObject();
        pObj.inWishlist = wishlistProductIds.includes(pObj._id.toString());
        return pObj;
      }),
      activePage: 'jewelry',
      categorySlug: categorySlug
    });
  } catch (err) {
    next(err);
  }
});

router.get('/collections', async function(req, res, next) {
  try {
    const colParam = req.query.col;
    let filter = { 'variants.quantity': { $gt: 0 } };
    let query = Product.find(filter).populate('category');
    if (colParam === 'new') query = query.sort({ createdAt: -1 });
    else if (colParam === 'bestseller') query = query.sort({ sold: -1 });
    else if (colParam === 'sale') query = query.sort({ price: 1 });

    const products = await query.exec();
    let wishlistProductIds = [];
    if (req.user) {
      const wishlist = await Wishlist.find({ user: req.user._id });
      wishlistProductIds = wishlist.map(w => w.product.toString());
    }
    res.render('home/index', {
      plainProduct: products.map(p => {
        const pObj = p.toObject();
        pObj.inWishlist = wishlistProductIds.includes(pObj._id.toString());
        return pObj;
      }),
      activePage: 'collections',
      colParam: colParam
    });
  } catch (err) {
    next(err);
  }
});


router.get('/search', async function(req, res, next) {
  try {
    const keyword = req.query.keyword;
    const products = await Product.find({
      'variants.quantity': { $gt: 0 },
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ]
    }).populate('category');

    let wishlistProductIds = [];
    if (req.user) {
      const wishlist = await Wishlist.find({ user: req.user._id });
      wishlistProductIds = wishlist.map(w => w.product.toString());
    }
    res.render('home/index', {
      plainProduct: products.map(p => {
        const pObj = p.toObject();
        pObj.inWishlist = wishlistProductIds.includes(pObj._id.toString());
        return pObj;
      }),
      keyword: keyword
    });
  } catch (err) {
    next(err);
  }
});

router.get('/wishlist', async function(req, res, next){
  try {
    if(!req.user) return res.redirect('/login');
    const wishlist = await Wishlist.find({ user: req.user._id }).populate('product');
    res.render('home/wishlist', { wishlist: wishlist.map(w => w.toObject()) });
  } catch (err) { next(err); }
});

router.get('/wishlist/add/:id', async function(req, res, next){
  try {
    if(!req.user) return res.redirect('/login');
    const existingWishlist = await Wishlist.findOne({ user: req.user._id, product: req.params.id });
    if(!existingWishlist){
      await new Wishlist({ user: req.user._id, product: req.params.id }).save();
    }
    res.redirect('back');
  } catch (err) { next(err); }
});

router.get('/wishlist/remove/:id', async function(req, res, next){
  try {
    await Wishlist.deleteOne({ _id: req.params.id });
    res.redirect('/wishlist');
  } catch (err) { next(err); }
});

router.get('/payment/success', async function(req, res) {
  try {

    const {
      orderCode,
      status
    } = req.query;

    if (
        status !== 'PAID' ||
        !orderCode
    ) {

      req.flash(
          'error_message',
          'Payment failed.'
      );

      return res.redirect(
          '/my-orders'
      );
    }

    const order =
        await Order.findOne({
          payosOrderCode:
              Number(orderCode)
        });

    if (!order) {

      req.flash(
          'error_message',
          'Order not found.'
      );

      return res.redirect(
          '/my-orders'
      );
    }

    if (
        order.status !== 'PendingPayment' ||
        order.paymentStatus !== 'Pending'
    ) {
      return res.redirect(
          '/my-orders'
      );
    }
    if (
        order.paymentStatus === 'Paid'
    ) {

      return res.redirect(
          '/my-orders/' +
          order._id
      );
    }

    order.status = 'Paid';
    order.paymentStatus = 'Paid';
    order.paidAt = new Date();

    await order.save();

    req.flash(
        'success_message',
        'Payment successful.'
    );

    return res.redirect(
        '/my-orders/' +
        order._id
    );

  } catch (err) {

    console.error(
        'PAYMENT SUCCESS ERROR:',
        err
    );

    return res.redirect(
        '/my-orders'
    );
  }
});

router.get('/payment/cancel', async function(req, res) {
  try {
    const { orderCode } = req.query;
    if (!orderCode) {
      req.flash(
          'error_message',
          'Payment cancelled.'
      );
      return res.redirect('/my-orders');
    }
    const order = await Order.findOne({
      payosOrderCode: Number(orderCode)
    });
    if (!order) {
      req.flash(
          'error_message',
          'Order not found.'
      );
      return res.redirect('/my-orders');
    }
    // tránh hoàn kho nhiều lần
    if (order.status === 'Cancelled') {

      req.flash(
          'error_message',
          'Order already cancelled.'
      );
      return res.redirect('/my-orders');
    }
    // chỉ xử lý PendingPayment
    if (order.status === 'PendingPayment') {
      order.status = 'Cancelled';
      order.paymentStatus = 'Failed';

      await order.save();
      // hoàn kho
      for (const item of order.items) {

        await Product.findOneAndUpdate(
            {
              _id: item.product_id,
              "variants.size": item.size
            },
            {
              $inc: {
                "variants.$.quantity": item.quantity,
                sold: -item.quantity
              }
            }
        );
      }
    }
    req.flash(
        'error_message',
        'Payment cancelled.'
    );
    return res.redirect('/my-orders');
  } catch (err) {
    console.error(
        'PAYMENT CANCEL ERROR:',
        err
    );
    return res.redirect('/my-orders');
  }
});

router.post('/payment/webhook', async (req, res) => {
  try {
    const webhookData =
        await payOS.webhooks.verify(req.body);
    console.log(
        'VERIFIED WEBHOOK:',
        webhookData
    );
    return res.status(200).json({
      message: 'received'
    });
  } catch (err) {

    console.error(
        'WEBHOOK VERIFY ERROR:',
        err
    );
    return res.status(400).json({
      message: 'invalid webhook'
    });

  }
});

router.get('/payment/:id', async function(req,res,next){
  try {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    if (!order) {

      req.flash(
          'error_message',
          'Order not found.'
      );

      return res.redirect(
          '/my-orders'
      );
    }
    if (
        order.status === 'PendingPayment' &&
        order.expiredAt &&
        order.expiredAt < new Date()
    ) {

      order.status = 'Cancelled';
      order.paymentStatus = 'Failed';

      await order.save();

      // hoàn kho
      for (const item of order.items) {
        await Product.findOneAndUpdate(
            {
              _id: item.product_id,
              "variants.size": item.size
            },
            {
              $inc: {
                "variants.$.quantity": item.quantity,
                sold: -item.quantity
              }
            }
        );
      }

      req.flash(
          'error_message',
          'This order has expired.'
      );

      return res.redirect('/my-orders');
    }
    if (
        order.status !== 'PendingPayment' ||
        order.paymentStatus !== 'Pending'
    ) {
      req.flash(
          'error_message',
          'This order cannot be paid.'
      );

      return res.redirect('/my-orders');
    }
    res.render(
        'home/payment',
        {
          order: order.toObject(),
          canPay:
              order.status === 'PendingPayment' && order.paymentStatus === 'Pending'
        }
    );
  } catch(err){
    next(err);
  }
});

router.post('/payment/create/:id', async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    if (!order) {
      req.flash(
          'error_message',
          'Can find your order.'
      );
      return res.redirect('/my-orders');
    }
    if (
        order.status !== 'PendingPayment' ||
        order.paymentStatus !== 'Pending'
    ) {
      req.flash(
          'error_message',
          'This order cannot be paid for..'
      );

      return res.redirect('/my-orders');
    }
    const orderCode = Number(
        `${Date.now()}${Math.floor(
            Math.random() * 1000
        )}`.slice(-12)
    );
    const domain =
        `${req.protocol}://${req.get('host')}`;
    const paymentData = {
      orderCode,
      amount: order.totalPrice,
      description:
          `Order ${orderCode}`,
      items: order.items.map(item => ({
        name: item.name.substring(0, 25),
        quantity: item.quantity,
        price: item.price_at_purchase
      })),
      returnUrl:
          `${domain}/payment/success`,
      cancelUrl:
          `${domain}/payment/cancel`
    };
    const result =
        await payos.paymentRequests.create(
            paymentData
        );
    order.payosOrderCode = orderCode;
    await order.save();
    res.redirect(
        result.checkoutUrl
    );
  } catch (err) {

    console.error(
        'PAYOS ERROR:',
        err
    );
    next(err);
  }
});

router.get('/profile', async function(req, res, next) {

  try {

    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }

    res.render(
        'home/profile',
        {
          userProfile: req.user.toObject(),
          activePage: 'profile'
        }
    );

  } catch (err) {
    next(err);
  }

});

router.get('/profile/edit', async function(req,res){

  if(!req.isAuthenticated()){
    return res.redirect('/login');
  }
  res.render(
      'home/edit-profile',
      {
        userProfile: req.user.toObject()
      }
  );
});

router.post('/profile/edit', async function(req,res,next){

  try{

    if(!req.isAuthenticated()){
      return res.redirect('/login');
    }

    await User.findByIdAndUpdate(
        req.user._id,
        {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          email: req.body.email,
          phone: req.body.phone,
          address: req.body.address
        }
    );

    req.flash(
        'success_message',
        'Profile updated successfully.'
    );

    return res.redirect('/profile');

  }catch(err){
    next(err);
  }
});
router.get('/change-password', function(req, res) {

  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }

  res.render(
      'home/change-password'
  );
});

router.post('/change-password', async function(req, res, next) {
      try {
        if (!req.isAuthenticated()) {
          return res.redirect('/login');
        }
        const {
          currentPassword,
          newPassword,
          confirmPassword
        } = req.body;
        const user = await User.findById(
                req.user._id
            );
        const matched = await bcryptjs.compare(
                currentPassword,
                user.password
            );
        if (!matched) {
          req.flash(
              'error_message',
              'Current password is incorrect.'
          );

          return res.redirect('/change-password'
          );
        }
        if (
            newPassword !== confirmPassword
        ) {
          req.flash(
              'error_message',
              'Passwords do not match.'
          );
          return res.redirect(
              '/change-password'
          );
        }

        const salt = await bcryptjs.genSalt(10);
        const hash = await bcryptjs.hash(
                newPassword,
                salt
            );
        user.password = hash;
        await user.save();
        req.flash(
            'success_message',
            'Password changed successfully.'
        );
        return res.redirect(
            '/profile'
        );
      } catch(err) {
        next(err);
      }
    }
);

module.exports = router;