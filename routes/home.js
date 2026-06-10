var express = require('express');
var router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const Wishlist = require('../models/Wishlist');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

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

/* Chi tiết sản phẩm */
/* Chi tiết sản phẩm - BẢN SỬA LỖI */
router.get('/product-detail/:id', async function (req, res, next) {
  try {
    const product = await Product.findOne({_id: req.params.id}).populate('category');
    if (!product) return res.status(404).send('Product not found');

    // --- SỬA ĐOẠN NÀY ---
    let relatedProductsRaw = [];
    if (product.category && product.category._id) {
      relatedProductsRaw = await Product.find({
        _id: {$ne: product._id},
        category: product.category._id, // Chỉ truy vấn liên quan nếu có category
        'variants.quantity': { $gt: 0 }
      }).populate('category').limit(4);
    }
    // --------------------

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

/* 2. Danh sách đơn hàng & Chi tiết đơn hàng */
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
    if (!order || order.status !== 'Pending') {
      req.flash('error_message', 'Order not found or cannot be cancelled.');
      return res.redirect('/my-orders');
    }
    order.status = 'Cancelled';
    await order.save();

    // Hoàn kho theo mảng variants
    for (let item of order.items) {
      await Product.findOneAndUpdate(
          { _id: item.product_id, "variants.size": item.size },
          { $inc: { "variants.$.quantity": item.quantity, sold: -item.quantity } }
      );
    }
    req.flash('success_message', 'Order has been cancelled successfully.');
    res.redirect('/payment/' + newOrder._id);
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
        $or: [
          { title: { $regex: new RegExp(categorySlug, "i") } },
          { slug: { $regex: new RegExp(categorySlug, "i") } }
        ]
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

router.get('/payment/:id', async function(req,res,next){
  try {
    const order = await Order.findById(
            req.params.id
        );
    if(!order){
      return res.redirect('/');
    }
    res.render(
        'home/payment',
        {
          order: order.toObject()
        }
    );
  } catch(err){
    next(err);
  }
});


module.exports = router;