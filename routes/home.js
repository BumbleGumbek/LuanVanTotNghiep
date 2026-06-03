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
router.get('/product-detail/:id', async function (req, res, next) {
  try {
    const product = await Product.findOne({_id: req.params.id}).populate('category');
    if (!product) return res.status(404).send('Product not found');

    const relatedProductsRaw = await Product.find({
      _id: {$ne: product._id},
      category: product.category._id,
      'variants.quantity': { $gt: 0 }
    }).populate('category').limit(4);

    let wishlistProductIds = [];
    if (req.user) {
      const wishlist = await Wishlist.find({ user: req.user._id });
      wishlistProductIds = wishlist.map(w => w.product.toString());
    }

    const productObj = product.toObject();
    productObj.inWishlist = wishlistProductIds.includes(productObj._id.toString());
    productObj.totalQuantity = productObj.variants.reduce((sum, item) => sum + item.quantity, 0);

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

/* Xem giỏ hàng */
router.get('/shopping-cart', async function(req, res, next){
  try {
    let totalPrice = 0;
    let totalQty = 0;
    let cartItems = [];

    if (req.isAuthenticated()) {
      const dbCart = await Cart.findOne({ user_id: req.user._id }).populate('items.product_id');
      if (dbCart && dbCart.items) {
        dbCart.items.forEach(item => {
          let p = item.product_id;
          // Kiểm tra phòng ngừa nếu sản phẩm bị xóa khỏi DB hệ thống
          if (p) {
            cartItems.push({
              product_id: p._id.toString(),
              name: p.name,
              image: p.image,
              price: p.price,
              quantity: item.quantity,
              size: item.size,
              total: p.price * item.quantity
            });
          }
        });
      }
    } else {
      cartItems = req.session.cart || [];
    }

    cartItems.forEach(item => {
      totalPrice += item.total;
      totalQty += item.quantity;
    });

    res.render('home/shopping-cart', {
      title: 'cart',
      product: cartItems,
      totalPrice: totalPrice,
      totalQty: totalQty
    });
  } catch (error) {
    next(error);
  }
});

/* Thêm vào giỏ hàng */
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
        // SỬA LỖI: Tính toán dựa vào giá gốc DB, phòng ngừa client gửi hack giá
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
          total: product.price * qty // Lấy từ giá DB thực tế
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
              item.total = item.price * item.quantity;
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

/* Giao diện thanh toán công khai */
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

    }

    else {
      const dbCart = await Cart.findOne({ user_id: req.user._id }).populate('items.product_id');

      if(!dbCart || !dbCart.items || dbCart.items.length <= 0){
        req.flash('error_message', 'Your shopping cart is empty.');
        return res.redirect('/shopping-cart');
      }

      dbCart.items.forEach(item => {
        let p = item.product_id;
        if (p) {
          let total = p.price * item.quantity;
          totalPrice += total;
          totalQty += item.quantity;
          cartItems.push({
            product_id: p._id.toString(),
            name: p.name,
            image: p.image,
            price: p.price,
            quantity: item.quantity,
            size: item.size,
            total: total
          });
        }
      });
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

/* Xử lý đặt hàng & Trừ kho */
/* Xử lý đặt hàng & Trừ kho (ĐÃ SỬA: Hỗ trợ cả luồng Giỏ hàng DB và Mua Ngay Session) */
router.post('/checkout', async function(req, res, next){
  if (!req.isAuthenticated()) return res.status(401).redirect('/login');

  try {
    // Validate thông tin giao hàng cơ bản
    if (!req.body.firstName || !req.body.phone || !req.body.address) {
      req.flash('error_message', 'Please fill in all required shipping fields.');
      return res.redirect('back');
    }

    let checkoutItems = [];
    let totalPrice = 0;
    let isBuyNow = false;

    // Kiểm tra xem có hàng Mua Ngay (Buy Now) không
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
      // Nếu không có hàng mua ngay, đọc từ Giỏ hàng Database gốc của bạn
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

    // Cơ chế trừ kho dựa trên cấu trúc VARIANTS mới của bạn
    const deductedItems = [];
    for (const item of checkoutItems) {
      const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.product_id,
            "variants.size": item.size,
            "variants.quantity": { $gte: item.quantity }
          },
          {
            $inc: {
              "variants.$.quantity": -item.quantity,
              sold: item.quantity
            }
          },
          { new: true }
      );

      if (!updatedProduct) {
        // Rollback nếu thiếu hàng
        for (const rolledBackItem of deductedItems) {
          await Product.findOneAndUpdate(
              { _id: rolledBackItem.id, "variants.size": rolledBackItem.size },
              { $inc: { "variants.$.quantity": rolledBackItem.qty, sold: -rolledBackItem.qty } }
          );
        }
        req.flash('error_message', `Sorry, product "${item.name}" (Size ${item.size}) is out of stock.`);
        return res.redirect('/shopping-cart');
      }
      deductedItems.push({ id: item.product_id, size: item.size, qty: item.quantity });
    }

    // Tạo đơn hàng chuẩn cấu trúc Model Order mới của bạn
    const newOrder = new Order({
      user: req.user._id,
      shippingAddress: {
        receiverName: `${req.body.firstName} ${req.body.lastName || ''}`.trim(),
        receiverPhone: req.body.phone,
        detailAddress: `${req.body.address}${req.body.city ? ', ' + req.body.city : ''}`
      },
      items: checkoutItems.map(item => ({
        product_id: item.product_id,
        name: item.name,
        image: item.image,
        size: item.size,
        price_at_purchase: item.price,
        quantity: item.quantity
      })),
      totalPrice: totalPrice,
      status: 'Pending'
    });

    await newOrder.save();

    // Dọn dẹp bộ nhớ tạm
    if (isBuyNow) {
      delete req.session.buyNowItem;
    } else {
      await Cart.deleteOne({ user_id: req.user._id });
    }

    req.flash('success_message', 'Your order has been placed successfully!');
    // SỬA LỖI: Trỏ thẳng về trang chi tiết đơn hàng vừa tạo hoặc danh sách đơn hàng
    res.redirect('/my-orders/' + newOrder._id);
  } catch (error) {
    console.error("ERROR WHEN SAVING ORDERS TO MONGO:", error);
    next(error);
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
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) {
      req.flash('error_message', 'Cannot find your order.');
      return res.redirect('/my-orders');
    }
    res.render('home/my-orders-detail', {
      order: order.toObject(),
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
    res.redirect('/my-orders/' + req.params.id);
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


module.exports = router;