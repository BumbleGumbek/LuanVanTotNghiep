var express = require('express');
var router = express.Router();

const Category = require('../models/Category');
const Product = require('../models/Product');


router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});


router.get('/', async function(req, res, next) {
    try {
        const categories = await Category.find({});

        const plainCategory = await Promise.all(categories.map(async (cat) => {

            const products = await Product.find({ category: cat._id });

            const totalQty = products.reduce((acc, p) => {
                const productInStock = p.variants && p.variants.length
                    ? p.variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
                    : 0;
                return acc + productInStock;
            }, 0);

            const catObj = cat.toObject();
            catObj.totalQty = totalQty; // Gán lại tổng số lượng chuẩn
            return catObj;
        }));

        res.render('admin/category/index', { plainCategory: plainCategory });
    } catch (err) {
        console.error("Lỗi lấy danh sách danh mục:", err);
        next(err);
    }
});

/* [GET] /admin/category/create - Hiển thị form tạo danh mục */
router.get('/create', function(req, res, next) {
    res.render('admin/category/create');
});

/* [POST] /admin/category/create - Xử lý tạo danh mục mới */
router.post('/create', async function (req, res, next) {
    try {
        const newCategory = new Category({
            title: req.body.title,
            description: req.body.description,
            status: req.body.status === 'true' || req.body.status === true
        });

        await newCategory.save();
        res.redirect('/admin/category');
    } catch (error) {
        console.error("Lỗi tạo danh mục:", error);
        res.redirect('back');
    }
});

/* [GET] /admin/category/edit/:id - Hiển thị form sửa danh mục */
router.get('/edit/:id', async function (req, res, next) {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).send('Category not found');

        res.render('admin/category/edit', {
            title: 'Edit Category',
            category: category.toObject()
        });
    } catch (err) {
        next(err);
    }
});

/* [POST hoặc PUT] /admin/category/edit/:id - Cập nhật danh mục */
router.post('/edit/:id', async function(req, res, next) {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).send('Category not found');

        category.title = req.body.title;
        category.description = req.body.description;
        category.status = req.body.status === 'true' || req.body.status === true;

        await category.save();
        res.redirect('/admin/category');
    } catch (err) {
        console.error("Lỗi cập nhật danh mục:", err);
        res.redirect('back');
    }
});

/* [GET] /admin/category/delete/:id - Xóa danh mục bằng Link thẻ A */
router.get('/delete/:id', async function (req, res, next) {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.redirect('/admin/category');
    } catch (err) {
        console.error("Lỗi xóa danh mục:", err);
        next(err);
    }
});

module.exports = router;