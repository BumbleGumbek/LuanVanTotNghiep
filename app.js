require('dotenv').config();
var createError = require('http-errors');

var express = require('express');
const {engine} = require('express-handlebars');

const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const flash = require('connect-flash');
const passport = require('passport');
const methodOverride = require('method-override');
// const MongoStore = require('connect-mongo');


var app = express();
var path = require('path');

var cookieParser = require('cookie-parser');
var logger = require('morgan');

app.engine(
    'hbs',
    engine({
      extname: 'hbs',
      defaultLayout: 'layouts',
      partialsDir: path.join(__dirname, 'views', 'partials'),
      layoutsDir: path.join(__dirname, 'views', 'layouts'),
      helpers: {
          eq: function (v1, v2) {
              return v1 === v2;
          },
          ne: function (v1, v2) {
              return v1 !== v2;
          },
          lt: function (v1, v2) {
              return v1 < v2;
          },
          gt: function (v1, v2) {
              return v1 > v2;
          },
          lte: function (v1, v2) {
              return v1 <= v2;
          },
          gte: function (v1, v2) {
              return v1 >= v2;
          },
        add: function (v1, v2) {
            return v1 + v2;
        },
        shortId: function (id) {
            if (!id) return "";
            const str = id.toString();
            return "#ORD-" + str.slice(-6).toUpperCase();
        },
        formatDate: function (date) {
            if (!date) return "";
            return new Date(date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },
          formatCurrency: function(value) {
              if (!value) return "0";
              return Number(value)
                  .toLocaleString('en-US');
          }
      }
    })
);

// method override
app.use(methodOverride('_method'));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
        url: 'mongodb://127.0.0.1:27017/Jewelry',
        ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    cookie: { 
        maxAge: 180 * 60 * 1000,
        httpOnly: true,
        secure: false // Set to true if using HTTPS
    }
}));

app.use(flash());
//PASSPORT
require('./config/passport')();

app.use(passport.initialize());
app.use(passport.session());

// Global Middleware
app.use(async (req, res, next) => {
    res.locals.user = req.user ? req.user.toObject() : null;
    res.locals.isAdmin = (req.user && req.user.role === 'admin');
    res.locals.isWarehouse = (req.user && req.user.role === 'warehouse');
    res.locals.isSupplier = (req.user && req.user.role === 'supplier');
    
    let totalQty = 0;
    let totalPrice = 0;
    let cartItems = [];

    try {
        if (req.isAuthenticated()) {
            const Cart = require('./models/Cart');
            const dbCart = await Cart.findOne({ user_id: req.user._id }).populate('items.product_id');
            if (dbCart && dbCart.items) {
                dbCart.items.forEach(item => {
                    if (item.product_id) {
                        totalQty += item.quantity;
                        totalPrice += (item.quantity * item.product_id.price);
                        cartItems.push(item);
                    }
                });
            }
        } else if (req.session.cart) {
            cartItems = req.session.cart;
            cartItems.forEach(item => {
                totalQty += item.quantity;
                totalPrice += item.total;
            });
        }
    } catch (err) {
        console.error("Cart Middleware Error:", err);
    }

    res.locals.totalQty = totalQty;
    res.locals.totalPrice = totalPrice;
    res.locals.product = cartItems;
    
    res.locals.success_message = req.flash('success_message');
    res.locals.error_message = req.flash('error_message');
    res.locals.error = req.flash('error');
    res.locals.errors = req.flash('errors');
    next();
});

var homeRouter = require('./routes/home');
var adminRouter = require('./routes/admin');
var cartRouter = require('./routes/cart');
var categoryRouter = require('./routes/category');
var productRouter = require('./routes/product');
var supplierRouter = require('./routes/supplier');
var loginRouter = require('./routes/login');
var registerRouter = require('./routes/register');
var usersRouter = require('./routes/users');
var adminOrderRouter = require('./routes/admin-order');
var inventoryRouter = require('./routes/inventory');
var importRequestRouter = require('./routes/import-request');
var supplierPortalRouter = require('./routes/supplier-portal');
var reviewRouter = require('./routes/review');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect('/login');
}

function isAdmin(req, res, next){
    if(req.isAuthenticated() && req.user && req.user.role === 'admin'){
        return next();
    }
    res.status(403).send('Access Denied: You do not have admin privileges');
}

function isWarehouse(req, res, next){
    if(
        req.isAuthenticated() &&
        req.user &&
        req.user.role === 'warehouse'
    ){
        return next();
    }

    res.status(403).send(
        'Access Denied: Warehouse only'
    );
}

function isWarehouseOrAdmin(req, res, next){
    if(
        req.isAuthenticated() && req.user &&
        (
            req.user.role === 'warehouse' ||
            req.user.role === 'admin'
        )
    ){
        return next();
    }
    res.status(403).send(
        'Access Denied'
    );
}

function isSupplier(req, res, next){
    if(req.isAuthenticated() && req.user && req.user.role === 'supplier'){
        return next();
    }
    res.status(403).send(
        'Access Denied: Supplier Only'
    );
}

app.use('/', homeRouter);
app.use('/', cartRouter);
app.use('/login', loginRouter);
app.use('/register', registerRouter);
app.use('/admin', isWarehouseOrAdmin, adminRouter);
app.use('/admin/category', isAdmin, categoryRouter);
app.use('/admin/product', isWarehouseOrAdmin, productRouter);
app.use('/admin/review', isAdmin, reviewRouter);
app.use('/admin/supplier', isAdmin, supplierRouter);
app.use('/admin/orders', isWarehouseOrAdmin, adminOrderRouter);
app.use('/admin/inventory', isWarehouseOrAdmin, inventoryRouter);
app.use('/admin/import-request', isWarehouseOrAdmin, importRequestRouter);
app.use('/supplier/import-request', isSupplier, supplierPortalRouter);
app.use('/users', isAdmin, usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

//database mongoDB
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const {Strategy: LocalStrategy} = require("passport-local");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://127.0.0.1:27017/Jewelry') // No callback here
    .then(() => {
        console.log("MongoDB connected successfully!");
    })
    .catch(err => {
        console.error("Error connecting to MongoDB:", err);
    });
//end mongoDB

// error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};
//
//   // render the error page
//   res.status(err.status || 500);
//   res.render('home/error');
// });

module.exports = app;
