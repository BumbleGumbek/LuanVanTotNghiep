const multer = require('multer');
var express = require('express');
var router = express.Router();
const Category = require('../models/Category');

const Product = require("../models/Product");

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });
router.all('/*', function (req,res,next) {
    res.app.locals.layout = 'admin';
    next();
})

/* GET home page. */
router.get('/', async function(req, res, next) {
    try {
        const categoryId = req.query.category;
        let filter = {};
        if (categoryId) {
            filter.category = categoryId;
        }

        const products = await Product.find(filter).populate('category');
        const categories = await Category.find({});
        
        const plainProduct = products.map(p => p.toObject());
        const plainCategories = categories.map(c => c.toObject());
        
        res.render('admin/product/index', {
            plainProduct: plainProduct,
            categories: plainCategories,
            selectedCategory: categoryId
        });
    } catch (err) {
        next(err);
    }
});
router.get('/create', function(req, res, next) {
    Category.find({})
        .then(category => {
            const plainCategory = category.map(cat => cat.toObject());
            res.render('admin/product/create', {plainCategory: plainCategory
            });
        });
});

router.post('/create', upload.single('image'), function(req, res, next) {
    if (req.body.quantity <= 0) {
        return res.send('Quantity must be greater than 0');
    }
    const newProduct = new Product({
            name: req.body.name,
            description: req.body.description,
            image: '/uploads/' + req.file.filename,
            category: req.body.category,
            price: req.body.price,
            quantity: req.body.quantity,
            status: req.body.status === 'true'
        });
        newProduct.save()
            .then(savedProduct => {
                res.redirect('/admin/product');
            });
});

router.get('/edit/:id', function (req, res, next) {
    Product.findOne({_id: req.params.id})
        .then(product => {
            res.render('admin/product/edit', {
                title: 'Edit Product',
                product: product.toObject() // <--- Convert to plain object
            });
        })

});
router.put('/edit/:id', function (req, res, next) {
    Product.findOne({_id: req.params.id})
        .then(product => {
            product.name = req.body.name;
            product.description = req.body.description;
            product.image = req.body.image;
            product.price = req.body.price;
            product.quantity = req.body.quantity;
            product.quantity = req.body.quantity;
            product.status = req.body.status;
            product.save().then(savedProduct => {
                res.redirect('/admin/product');
            });
        });
});

router.delete('/:id', function (req, res, next) {
    Product.deleteOne({_id: req.params.id}).then(deleteProduct => {
        res.redirect('/admin/product');
    });

});

router.get('/inventory', function(req, res, next) {
    Product.find({})
        .then(product => {
            const plainProduct = product.map(cat => cat.toObject());
            res.render('admin/product/inventory', {plainProduct: plainProduct
            });
        });
});
module.exports = router;
