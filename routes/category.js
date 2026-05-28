var express = require('express');
var router = express.Router();

const Category = require('../models/Category');
const Product = require('../models/Product');

router.all('/*', function (req,res,next) {
    res.app.locals.layout = 'admin';
    next();
})

/* GET home page. */
router.get('/', async function(req, res, next) {
    try {
        const categories = await Category.find({});
        const plainCategory = await Promise.all(categories.map(async (cat) => {
            const products = await Product.find({ category: cat._id });
            const totalQty = products.reduce((acc, p) => acc + p.quantity, 0);
            const catObj = cat.toObject();
            catObj.totalQty = totalQty;
            return catObj;
        }));
        res.render('admin/category/index', { plainCategory: plainCategory });
    } catch (err) {
        next(err);
    }
});
router.get('/create', function(req, res, next) {
    res.render('admin/category/create');

});

router.post('/create', function (req, res, next) {
    const newCategory = new Category({
        title: req.body.title,
        description: req.body.description,
        status: req.body.status,
        body: req.body,
    });
    newCategory.save().then(savedCategory => {
        res.redirect('/admin/category');
    }).catch(function (error) {
        console.log(error);
    })
    console.log(req.body);
    //res.render('admin/category/create', { title: 'Create Category' });
});

router.get('/edit/:id', function (req, res, next) {
    Category.findOne({_id: req.params.id})
        .then(category => {
            res.render('admin/category/edit', {
                title: 'Edit Category',
                category: category.toObject() // <--- Convert to plain object
            });
        })

});
router.put('/edit/:id', function(req, res, next) {
    Category.findOne({_id: req.params.id})
        .then(category => {
            category.title = req.body.title;
            category.description = req.body.description;
            category.status = req.body.status;
            category.save()
                .then(savedCategory => {
                    res.redirect('/admin/category');
                });
        });
});
router.delete('/:id', function (req, res, next) {
    Category.deleteOne({_id: req.params.id}).then(deleteCategory => {
        res.redirect('/admin/category');
    });

});

module.exports = router;
