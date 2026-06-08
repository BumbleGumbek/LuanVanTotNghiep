const multer = require('multer');
var express = require('express');
var router = express.Router();
const Category = require('../models/Category');
const Product = require("../models/Product");
const Supplier = require("../models/Supplier"); // <-- 1. Thêm Model Supplier vào đây

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});

/* [GET] /admin/product - Danh sách sản phẩm (Đã populate cả danh mục & nhà cung cấp) */
router.get('/', async function(req, res, next) {
    try {
        const categoryId = req.query.category;
        let filter = {};
        if (categoryId) {
            filter.category = categoryId;
        }

        // Populate luôn cả supplier để sau này hiển thị tên nhà cung cấp nếu cần
        const products = await Product.find(filter).populate('category').populate('supplier');
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

/* [GET] /admin/product/create - Hiển thị Form thêm sản phẩm (Đã nhúng Supplier) */
router.get('/create', async function(req, res, next) {
    try {
        const categories = await Category.find({});
        const suppliers = await Supplier.find({ status: true }); // Chỉ lấy supplier đang hoạt động

        res.render('admin/product/create', {
            plainCategory: categories.map(c => c.toObject()),
            plainSupplier: suppliers.map(s => s.toObject()) // <-- Truyền danh sách Supplier sang giao diện tạo
        });
    } catch (err) {
        next(err);
    }
});

/* [POST] /admin/product/create - Xử lý thêm sản phẩm mới */
router.post('/create', upload.single('image'), async function(req, res, next) {
    try {
        let variants = [];

        // Vì Form của Ngân gửi lên mảng dạng sizes[] và quantities[]
        // Express sẽ nhận diện thành req.body.sizes và req.body.quantities
        if (req.body.sizes && req.body.quantities) {
            const sizes = Array.isArray(req.body.sizes) ? req.body.sizes : [req.body.sizes];
            const quantities = Array.isArray(req.body.quantities) ? req.body.quantities : [req.body.quantities];

            for (let i = 0; i < sizes.length; i++) {
                if (sizes[i].trim() !== '') { // Bỏ qua nếu dòng đó bị bỏ trống size
                    variants.push({
                        size: sizes[i],
                        quantity: parseInt(quantities[i], 10) || 0
                    });
                }
            }
        }

        const newProduct = new Product({
            name: req.body.name,
            description: req.body.description,
            image: req.file ? '/uploads/' + req.file.filename : (req.body.imageUrl || '/uploads/default.jpg'),
            category: req.body.category,
            supplier: req.body.supplier,
            price: req.body.price,
            variants: variants, // Lưu mảng variants cực đẹp vào DB
            status: req.body.status === 'true'
        });

        await newProduct.save();
        res.redirect('/admin/product');
    } catch (err) {
        console.error("Lỗi khi tạo sản phẩm mới:", err);
        next(err);
    }
});

/* [GET] /admin/product/edit/:id - Hiển thị Form sửa sản phẩm */
router.get('/edit/:id', async function (req, res, next) {
    try {
        const product = await Product.findById(req.params.id);
        const categories = await Category.find({});
        const suppliers = await Supplier.find({ status: true });

        if (!product) return res.status(404).send('Product not found');

        res.render('admin/product/edit', {
            title: 'Edit Product',
            product: product.toObject(),
            plainCategory: categories.map(c => c.toObject()),
            plainSupplier: suppliers.map(s => s.toObject())
        });
    } catch (err) {
        next(err);
    }
});

/* [PUT hoặc POST tùy config form] /admin/product/edit/:id - Cập nhật sản phẩm */
router.post('/edit/:id', upload.single('image'), async function (req, res, next) {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).send('Product not found');

        // Xử lý cập nhật mảng variants từ form sửa
        let variants = [];
        if (req.body.sizes && req.body.quantities) {
            const sizes = Array.isArray(req.body.sizes) ? req.body.sizes : [req.body.sizes];
            const quantities = Array.isArray(req.body.quantities) ? req.body.quantities : [req.body.quantities];

            for (let i = 0; i < sizes.length; i++) {
                if (sizes[i]) {
                    variants.push({
                        size: sizes[i],
                        quantity: parseInt(quantities[i], 10)
                    });
                }
            }
            product.variants = variants;
        }

        product.name = req.body.name;
        product.description = req.body.description;
        if (req.file) {
            product.image = '/uploads/' + req.file.filename;
        }
        product.category = req.body.category;
        product.supplier = req.body.supplier;
        product.price = req.body.price;
        product.status = req.body.status === 'true';

        await product.save();
        res.redirect('/admin/product');
    } catch (err) {
        next(err);
    }
});

/* [DELETE hoặc GET tùy link xóa] /admin/product/delete/:id */
router.get('/delete/:id', async function (req, res, next) {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/admin/product');
    } catch (err) {
        next(err);
    }
});

router.get('/inventory', async function(req, res, next) {
    try {
        const products = await Product.find({}).populate('category');

        const plainProduct = products.map(p => {
            const pObj = p.toObject();
            pObj.totalInventory = pObj.variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
            return pObj;
        });

        res.render('admin/product/inventory', {
            plainProduct: plainProduct
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;