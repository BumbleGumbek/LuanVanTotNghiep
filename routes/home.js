var express = require('express');
var router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const Wishlist = require('../models/Wishlist');
const Order = require('../models/Order');

// Middleware to set default layout and active page
router.use((req, res, next) => {
  res.app.locals.layout = 'home';
  next();
});

/* GET home page. */
router.get('/', async function(req, res, next) {
  try {
    const products = await Product.find({ quantity: { $gt: 0 } }).sort({ createdAt: -1 }).limit(9);
    
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
})

router.get('/product-detail/:id', async function (req, res, next) {
  try {
    const product = await Product.findOne({_id: req.params.id}).populate('category');
    if (!product) return res.status(404).send('Product not found');

    const relatedProductsRaw = await Product.find({
      _id: {$ne: product._id}, 
      category: product.category._id,
      quantity: { $gt: 0 }
    }).populate('category').limit(4);

    let wishlistProductIds = [];
    if (req.user) {
      const wishlist = await Wishlist.find({ user: req.user._id });
      wishlistProductIds = wishlist.map(w => w.product.toString());
    }

    const productObj = product.toObject();
    productObj.inWishlist = wishlistProductIds.includes(productObj._id.toString());

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

router.get('/shopping-cart', function(req, res){
  let totalPrice = 0;
  let totalQty = 0;
  if(req.session.cart){
    req.session.cart.forEach(item => {
      totalPrice += item.total;
      totalQty += item.quantity;
    });
  }
  res.render('home/shopping-cart', {
    title: 'cart',
    product: req.session.cart,
    totalPrice: totalPrice,
    totalQty: totalQty
  });
});

router.post('/add-cart/:id', async function(req, res){
  const product = await Product.findById(req.params.id);
  let qty = parseInt(req.body.qty) || 1;
  const action = req.body.action;

  if(product.quantity <= 0){
    return res.send('Product out of stock');
  }
  if(!req.session.cart){
    req.session.cart = [];
  }
  let cart = req.session.cart;
  let existingProduct = cart.find(
      item => item._id == product._id
  );
  if(existingProduct){
    if(existingProduct.quantity + qty > product.quantity){
      existingProduct.quantity = product.quantity;
    } else {
      existingProduct.quantity += qty;
    }
    existingProduct.total =
        existingProduct.quantity * existingProduct.price;
  } else {
    if(qty > product.quantity){
      qty = product.quantity;
    }
    cart.push({
      _id: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: qty,
      total: product.price * qty
    });
  }

  if (action === 'buy_now') {
    res.redirect('/checkout');
  } else {
    res.redirect('/shopping-cart');
  }
});

router.get('/remove-cart/:id', function(req, res){
  if(!req.session.cart){
    return res.redirect('/shopping-cart');
  }
  req.session.cart = req.session.cart.filter(item =>
          item._id != req.params.id
      );
  res.redirect('/shopping-cart');
});

router.post('/update-cart', async function(req, res){
  let cart = req.session.cart;
  if(!cart){
    return res.redirect('/shopping-cart');
  }
  const quantities = req.body.quantities;
  for(let item of cart){
    const product = await Product.findById(item._id);
    let newQty = parseInt(quantities[item._id]);
    if(newQty <= 0){
      req.session.cart =
          req.session.cart.filter(cartItem =>
              cartItem._id != item._id
          );
      continue;
    }
    if(newQty > product.quantity){
      newQty = product.quantity;
    }
    item.quantity = newQty;
    item.total = item.price * item.quantity;
  }
  res.redirect('/shopping-cart');
});

router.get('/about', function(req, res, next) {
  res.render('home/about', { title: 'About', activePage: 'about' });
});
router.get('/contact', function(req, res, next) {
  res.render('home/contact', { title: 'Contact', activePage: 'contact' });
});

router.get('/search', async function(req, res) {
  const keyword = req.query.keyword;
  const products = await Product.find({
    quantity: { $gt: 0 },
    $or: [
      {
        name: { $regex: keyword, $options: 'i' }
      },
      {
        description: { $regex: keyword, $options: 'i' }
      }
    ]
  }).populate('category');

  let wishlistProductIds = [];
  if (req.user) {
    const wishlist = await Wishlist.find({ user: req.user._id });
    wishlistProductIds = wishlist.map(w => w.product.toString());
  }

  const plainProduct = products.map(p => {
    const pObj = p.toObject();
    pObj.inWishlist = wishlistProductIds.includes(pObj._id.toString());
    return pObj;
  });

  res.render('home/index', {
    plainProduct: plainProduct,
    keyword: keyword
  });
});

router.get('/wishlist/add/:id', async function(req, res){
  if(!req.user){
    return res.redirect('/login');
  }
  const productId = req.params.id;
  const existingWishlist = await Wishlist.findOne({
    user: req.user._id,
    product: productId
  });
  if(!existingWishlist){
    const newWishlist = new Wishlist({
      user: req.user._id,
      product: productId
    });
    await newWishlist.save();
  }
  res.redirect('back');
});

router.get('/wishlist', async function(req, res){
  if(!req.user){
    return res.redirect('/login');
  }
  const wishlist = await Wishlist.find({
    user: req.user._id
  }).populate('product');
  res.render('home/wishlist', {
    wishlist: wishlist.map(w => w.toObject())
  });
});

router.get('/wishlist/remove/:id', async function(req, res){
  await Wishlist.deleteOne({_id: req.params.id});
  res.redirect('/wishlist');
});


router.get('/checkout', function(req, res){
  if (!req.isAuthenticated()) {
    req.session.oldUrl = '/checkout';
    req.flash('error_message', 'Please login or create an account to make a payment.');
    return req.session.save(err => {
        res.redirect('/login');
    });
  }
  if(!req.session.cart || req.session.cart.length <= 0){
    req.flash('error_message', 'Your shopping cart is empty.');
    return res.redirect('/shopping-cart');
  }
  let totalPrice = 0;
  let totalQty = 0;
  req.session.cart.forEach(item => {
    totalPrice += item.total;
    totalQty += item.quantity;
  });

  res.render('home/checkout', {
    title: 'Checkout',
    product: req.session.cart,
    totalPrice: totalPrice,
    totalQty: totalQty,
    activePage: 'checkout'
  });
});

router.post('/checkout', async function(req, res){
  if(!req.session.cart || req.session.cart.length <= 0){
    return res.redirect('/shopping-cart');
  }
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  let totalPrice = 0;
  let totalQty = 0;
  req.session.cart.forEach(item => {
    totalPrice += item.total;
    totalQty += item.quantity;
  });
  try {

    const deductedItems = [];
    for (const item of req.session.cart) {
      const updatedProduct = await Product.findOneAndUpdate(
        { 
          _id: item._id, 
          quantity: { $gte: item.quantity } // Chỉ trừ nếu kho đủ hàng
        },
        { 
          $inc: { 
            quantity: -item.quantity, 
            sold: item.quantity 
          } 
        }
      );

      if (!updatedProduct) {

        for (const rolledBackItem of deductedItems) {
          await Product.findByIdAndUpdate(rolledBackItem.id, {
            $inc: { quantity: rolledBackItem.qty, sold: -rolledBackItem.qty }
          });
        }
        req.flash('error_message', `Sorry, product "${item.name}" is out of stock or insufficient quantity.`);
        return res.redirect('/shopping-cart');
      }
      deductedItems.push({ id: item._id, qty: item.quantity });
    }

    const newOrder = new Order({
      user: req.user._id,
      shippingAddress: {
        fullName: req.body.firstName + ' ' + req.body.lastName,
        phone: req.body.phone,
        address: req.body.address,
        city: req.body.city
      },
      items: req.session.cart.map(item => ({
        product: item._id,
        snapshot: {
          name: item.name,
          image: item.image,
          price: item.price
        },
        quantity: item.quantity,
        subtotal: item.total
      })),
      totalQuantity: totalQty,
      totalPrice: totalPrice,
      note: req.body.note,
      orderStatus: 'Pending_Payment' // Trạng thái mới từ Bước 1
    });

    await newOrder.save();
    req.session.cart = [];
    req.flash('success_message', 'Your order has been placed! We have reserved your items for 15 minutes. Please complete the payment.');
    res.redirect('/my-orders/' + newOrder._id);
  } catch (error) {
    console.error("ERROR WHEN SAVING ORDERS TO MONGO:", error);
    res.status(500).send("An error occurred while saving the order, please check your Terminal.!");
  }
});

router.get('/my-orders', async (req, res) => {
    if(!req.isAuthenticated()){
        req.flash('error_message', 'Please login to view your orders');
        return res.redirect('/login');
    }
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 });

        res.render('home/my-orders', {
            title: 'My Orders',
            orders: orders.map(order => order.toObject()),
            activePage: 'orders'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/jewelry', async function(req, res) {
  try {
    const categorySlug = req.query.cat;
    let filter = { quantity: { $gt: 0 } };
    if (categorySlug) {
      const category = await Category.findOne({ 
        $or: [
          { title: { $regex: new RegExp(categorySlug, "i") } },
          { slug: { $regex: new RegExp(categorySlug, "i") } }
        ]
      });
      if (category) {
        filter.category = category._id;
      } else {
        return res.render('home/index', {
          plainProduct: [],
          activePage: 'jewelry',
          categorySlug: categorySlug
        });
      }
    }

    const products = await Product.find(filter).populate('category');
    let wishlistProductIds = [];
    if (req.user) {
      const wishlist = await Wishlist.find({ user: req.user._id });
      wishlistProductIds = wishlist.map(w => w.product.toString());
    }
    const plainProduct = products.map(p => {
      const pObj = p.toObject();
      pObj.inWishlist = wishlistProductIds.includes(pObj._id.toString());
      return pObj;
    });

    res.render('home/index', {
      plainProduct: plainProduct,
      activePage: 'jewelry',
      categorySlug: categorySlug
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/collections', async function(req, res) {
  try {
    const colParam = req.query.col;
    let filter = { quantity: { $gt: 0 } };
    let query = Product.find(filter).populate('category');

    if (colParam === 'new') {
      query = query.sort({ createdAt: -1 });
    } else if (colParam === 'bestseller') {

        query = query.sort({ sold: -1 });
    } else if (colParam === 'sale') {
        query = query.sort({ price: 1 });
    }

    const products = await query.exec();
    
    let wishlistProductIds = [];
    if (req.user) {
      const wishlist = await Wishlist.find({ user: req.user._id });
      wishlistProductIds = wishlist.map(w => w.product.toString());
    }

    const plainProduct = products.map(p => {
      const pObj = p.toObject();
      pObj.inWishlist = wishlistProductIds.includes(pObj._id.toString());
      return pObj;
    });

    res.render('home/index', {
      plainProduct: plainProduct,
      activePage: 'collections',
      colParam: colParam
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// =========================================================================
// ROUTE: Xem chi tiết một đơn hàng cụ thể
// =========================================================================
router.get('/my-orders/:id', async function(req, res) {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }

    const orderId = req.params.id;
    const order = await Order.findOne({ _id: orderId, user: req.user._id });

    if (!order) {
      req.flash('error_message', 'Can find your order.');
      return res.redirect('/my-orders');
    }
    const plainOrder = order.toObject();
    res.render('home/my-orders-detail', {
      order: plainOrder,
      activePage: 'orders'
    });

  } catch (err) {
    console.error("Error order detail" +
        ":", err);
    res.status(500).send('Internal Server Error');
  }
});

// =========================================================================
// ROUTE: Hủy đơn hàng
// =========================================================================
router.post('/cancel-order/:id', async function(req, res) {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }

    const orderId = req.params.id;
    const order = await Order.findOne({ _id: orderId, user: req.user._id });

    if (!order) {
      req.flash('error_message', 'Order not found.');
      return res.redirect('/my-orders');
    }

    if (order.orderStatus !== 'Pending') {
      req.flash('error_message', 'Only pending orders can be cancelled.');
      return res.redirect('/my-orders/' + orderId);
    }

    // Cập nhật trạng thái đơn hàng
    order.orderStatus = 'Cancelled';
    await order.save();

    // Hoàn lại số lượng tồn kho và giảm số lượng đã bán
    for (let item of order.items) {
      await Product.findByIdAndUpdate(item.product, { 
        $inc: { 
          quantity: item.quantity, 
          sold: -item.quantity 
        } 
      });
    }

    req.flash('success_message', 'Order has been cancelled successfully.');
    res.redirect('/my-orders/' + orderId);

  } catch (err) {
    console.error("Error cancelling order:", err);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
