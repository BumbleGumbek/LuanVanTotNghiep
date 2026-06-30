var express = require('express');
var router = express.Router();

const Brand = require('../models/Brand');
const Product = require('../models/Product');

router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});

/* [GET] /admin/brand - Danh sách thương hiệu */
router.get('/', async function (req, res, next) {
    try {
        const keyword = (req.query.keyword || '').trim();

        let query = {};

        if (keyword) {
            query = {
                $or: [
                    { name: { $regex: keyword, $options: 'i' } },
                    { code: { $regex: keyword, $options: 'i' } }
                ]
            };
        }

        const brands = await Brand.find(query)
            .sort({
                displayOrder: 1,
                name: 1
            });

        const plainBrands = brands.map(item => item.toObject());

        res.render('admin/brand/index', {
            brands: plainBrands,
            keyword
        });

    } catch (err) {
        console.error("Lỗi lấy danh sách thương hiệu:", err);
        next(err);
    }
});

/* [GET] /admin/brand/create */
router.get('/create', function (req, res, next) {
    res.render('admin/brand/create');
});

/* [POST] /admin/brand/create */
router.post('/create', async function (req, res, next) {

    try {

        const name = req.body.name.trim();
        const code = (req.body.code || '').trim().toUpperCase();
        const description = (req.body.description || '').trim();
        const country = (req.body.country || '').trim();
        const displayOrder = Number(req.body.displayOrder) || 0;
        const status = req.body.status === 'true';

        const existedName = await Brand.findOne({ name });

        if (existedName) {
            req.flash('error_message', 'Brand name already exists.');
            return res.redirect('back');
        }

        const existedCode = await Brand.findOne({ code });

        if (existedCode) {
            req.flash('error_message', 'Brand code already exists.');
            return res.redirect('back');
        }

        const newBrand = new Brand({
            name,
            code,
            description,
            country,
            displayOrder,
            status
        });

        await newBrand.save();

        req.flash('success_message', 'Brand created successfully.');
        res.redirect('/admin/brand');

    } catch (err) {

        if (err.code === 11000) {
            req.flash('error_message', 'Brand name or code already exists.');
            return res.redirect('back');
        }

        console.error("Lỗi tạo thương hiệu:", err);
        next(err);
    }

});

/* [GET] /admin/brand/edit/:id */
router.get('/edit/:id', async function (req, res, next) {

    try {

        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            req.flash('error_message', 'Brand not found.');
            return res.redirect('/admin/brand');
        }

        res.render('admin/brand/edit', {
            brand: brand.toObject()
        });

    } catch (err) {

        console.error(err);
        next(err);

    }

});

/* [POST] /admin/brand/edit/:id */
router.post('/edit/:id', async function (req, res, next) {

    try {

        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            req.flash('error_message', 'Brand not found.');
            return res.redirect('/admin/brand');
        }

        const name = req.body.name.trim();
        const code = req.body.code.trim().toUpperCase();

        const existedName = await Brand.findOne({
            name,
            _id: { $ne: brand._id }
        });

        if (existedName) {
            req.flash('error_message', 'Brand name already exists.');
            return res.redirect('back');
        }

        const existedCode = await Brand.findOne({
            code,
            _id: { $ne: brand._id }
        });

        if (existedCode) {
            req.flash('error_message', 'Brand code already exists.');
            return res.redirect('back');
        }

        brand.name = name;
        brand.code = code;
        brand.description = req.body.description.trim();
        brand.country = req.body.country.trim();
        brand.displayOrder = Number(req.body.displayOrder) || 0;
        brand.status = req.body.status === 'true';

        await brand.save();

        req.flash('success_message', 'Brand updated successfully.');
        res.redirect('/admin/brand');

    } catch (err) {

        if (err.code === 11000) {
            req.flash('error_message', 'Brand name or code already exists.');
            return res.redirect('back');
        }

        console.error("Lỗi cập nhật thương hiệu:", err);
        next(err);

    }

});

/* [GET] /admin/brand/delete/:id */
router.get('/delete/:id', async function (req, res, next) {

    try {

        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            req.flash('error_message', 'Brand not found.');
            return res.redirect('/admin/brand');
        }

        const product = await Product.findOne({
            brand: brand._id
        });

        if (product) {
            req.flash(
                'error_message',
                'Cannot delete brand because it is being used by products.'
            );

            return res.redirect('/admin/brand');
        }

        await Brand.findByIdAndDelete(brand._id);

        req.flash('success_message', 'Brand deleted successfully.');
        res.redirect('/admin/brand');

    } catch (err) {

        console.error("Lỗi xóa thương hiệu:", err);
        next(err);

    }

});

module.exports = router;