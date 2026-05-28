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
          return String(v1) === String(v2);
        },
        gt: function (v1, v2) {
          return v1 > v2;
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
app.use(passport.initialize());
app.use(passport.session());

// Global Middleware
app.use((req, res, next) => {
    res.locals.user = req.user ? req.user.toObject() : null;
    res.locals.isAdmin = (req.user && req.user.role === 'admin');
    
    let totalQty = 0;
    let totalPrice = 0;
    if (req.session.cart) {
        req.session.cart.forEach(item => {
            totalQty += item.quantity;
            totalPrice += item.total;
        });
    }
    res.locals.totalQty = totalQty;
    res.locals.totalPrice = totalPrice;
    
    res.locals.success_message = req.flash('success_message');
    res.locals.error_message = req.flash('error_message');
    res.locals.error = req.flash('error'); // Passport.js often uses 'error'
    res.locals.errors = req.flash('errors');
    next();
});
app.use((req, res, next) => {
    res.locals.product = req.session.cart;
    next();
});
var homeRouter = require('./routes/home');
var adminRouter = require('./routes/admin');
var categoryRouter = require('./routes/category');
var productRouter = require('./routes/product');
var loginRouter = require('./routes/login');

var registerRouter = require('./routes/register');
var usersRouter = require('./routes/users');
var adminOrderRouter = require('./routes/admin-order');


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

app.use('/', homeRouter);
app.use('/login', loginRouter);
app.use('/register', registerRouter);
app.use('/admin', isAdmin, adminRouter);
app.use('/admin/category', isAdmin, categoryRouter);
app.use('/admin/product', isAdmin, productRouter);
app.use('/admin/orders', isAdmin, adminOrderRouter);
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
