var express = require('express');
var router = express.Router();
const multer = require('multer');
const Product = require('../models/Product');
const StockImport = require('../models/StockImport');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const { hasRole } = require('../middlewares/authorization');

// Setup multer for uploading new product images
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function(req, file, cb){
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG and WEBP files are allowed.'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});

router.get('/overview', hasRole('admin', 'store_manager', 'warehouse'), async function(req, res, next) {
    try {
        const { filter = 'all', sort = '', keyword = '' } = req.query;

        let dbFilter = {};
        if (keyword) {
            dbFilter.name = {
                $regex: keyword,
                $options: 'i'
            };
        }

        const products = await Product.find(dbFilter).populate('category');
        let plainProducts = [];
        const today = new Date();

        for (const p of products) {
            const pObj = p.toObject();
            
            // Current Stock: Sum variants.quantity
            const currentStock = pObj.variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
            
            // Imported: Sum StockImport.quantity for this product
            const importAgg = await StockImport.aggregate([
                { $match: { product: p._id } },
                { $group: { _id: null, totalImported: { $sum: '$quantity' } } }
            ]);
            const imported = importAgg.length > 0 ? importAgg[0].totalImported : 0;
            
            // Sold: product.sold
            const sold = pObj.sold || 0;
            
            // Last Import Date: Newest StockImport for this product
            const lastImport = await StockImport.findOne({ product: p._id })
                .sort({ importDate: -1 });
            
            let lastImportDateStr = 'N/A';
            let lastImportDateObj = null;
            let daysOnShelf = 'N/A';
            let daysOnShelfVal = -1; // numeric value for sorting
            
            if (lastImport) {
                lastImportDateObj = new Date(lastImport.importDate);
                lastImportDateStr = lastImportDateObj.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
                
                // Days On Shelf: Today - Last Import Date
                const diffTime = Math.abs(today - lastImportDateObj);
                daysOnShelfVal = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                daysOnShelf = daysOnShelfVal;
            }
            
            // Status: Out of Stock, Low Stock, In Stock
            let statusBadge = 'success';
            let statusText = 'In Stock';
            let statusKey = 'inStock';
            
            if (currentStock === 0) {
                statusBadge = 'danger';
                statusText = 'Out of Stock';
                statusKey = 'outOfStock';
            } else if (currentStock <= (pObj.lowStockThreshold || 5)) {
                statusBadge = 'warning';
                statusText = 'Low Stock';
                statusKey = 'lowStock';
            }
            
            // Performance Rule:
            // No Sales: sold === 0 && daysOnShelf >= 30
            // Slow Moving: daysOnShelf >= 30 && sold <= 5
            // Fast Moving: sold >= 10
            // Normal: default
            let perfText = 'Normal';
            let perfBadge = 'primary'; // blue badge
            
            if (sold === 0 && daysOnShelfVal >= 30) {
                perfText = 'No Sales';
                perfBadge = 'danger'; // red
            } else if (daysOnShelfVal >= 30 && sold <= 5) {
                perfText = 'Slow Moving';
                perfBadge = 'warning text-dark'; // yellow
            } else if (sold >= 10) {
                perfText = 'Fast Moving';
                perfBadge = 'success'; // green
            }
            
            plainProducts.push({
                ...pObj,
                currentStock,
                imported,
                sold,
                lastImportDate: lastImportDateStr,
                lastImportDateObj,
                daysOnShelf,
                daysOnShelfVal,
                statusText,
                statusBadge,
                statusKey,
                perfText,
                perfBadge
            });
        }

        // Apply filters
        if (filter !== 'all') {
            plainProducts = plainProducts.filter(p => p.statusKey === filter);
        }

        // Apply sorting
        if (sort === 'mostSold') {
            plainProducts.sort((a, b) => b.sold - a.sold);
        } else if (sort === 'leastSold') {
            plainProducts.sort((a, b) => a.sold - b.sold);
        } else if (sort === 'highestStock') {
            plainProducts.sort((a, b) => b.currentStock - a.currentStock);
        } else if (sort === 'lowestStock') {
            plainProducts.sort((a, b) => a.currentStock - b.currentStock);
        } else if (sort === 'oldestOnShelf') {
            plainProducts.sort((a, b) => b.daysOnShelfVal - a.daysOnShelfVal);
        } else if (sort === 'newestImport') {
            plainProducts.sort((a, b) => {
                const dateA = a.lastImportDateObj ? a.lastImportDateObj.getTime() : 0;
                const dateB = b.lastImportDateObj ? b.lastImportDateObj.getTime() : 0;
                return dateB - dateA;
            });
        }

        // Populate dropdown options state
        const filterOptions = [
            { value: 'all', text: 'All Products', selected: filter === 'all' },
            { value: 'inStock', text: 'In Stock', selected: filter === 'inStock' },
            { value: 'lowStock', text: 'Low Stock', selected: filter === 'lowStock' },
            { value: 'outOfStock', text: 'Out Of Stock', selected: filter === 'outOfStock' }
        ];

        const sortOptions = [
            { value: '', text: 'Default Sort', selected: !sort },
            { value: 'mostSold', text: 'Most Sold', selected: sort === 'mostSold' },
            { value: 'leastSold', text: 'Least Sold', selected: sort === 'leastSold' },
            { value: 'highestStock', text: 'Highest Stock', selected: sort === 'highestStock' },
            { value: 'lowestStock', text: 'Lowest Stock', selected: sort === 'lowestStock' },
            { value: 'oldestOnShelf', text: 'Oldest On Shelf', selected: sort === 'oldestOnShelf' },
            { value: 'newestImport', text: 'Newest Import', selected: sort === 'newestImport' }
        ];

        res.render('admin/inventory/overview', {
            title: 'Stock Overview',
            plainProducts,
            filterOptions,
            sortOptions,
            selectedFilter: filter,
            selectedSort: sort,
            keyword,
            success_message: req.flash('success_message')
        });
    } catch (err) {
        next(err);
    }
});

router.get('/import', hasRole('admin', 'warehouse'), async function(req, res, next) {
    try {
        const products = await Product.find({}).populate('category').populate('supplier');
        const categories = await Category.find({});
        const suppliers = await Supplier.find({ status: true });

        const plainProducts = products.map(p => p.toObject());
        const plainCategories = categories.map(c => c.toObject());
        const plainSuppliers = suppliers.map(s => s.toObject());

        res.render('admin/inventory/import', {
            title: 'Import Stock',
            plainProducts,
            plainCategories,
            plainSuppliers,
            productsJson: JSON.stringify(plainProducts)
        });
    } catch (err) {
        next(err);
    }
});

router.post('/import', hasRole('admin', 'warehouse'), upload.single('image'), async function(req, res, next) {
    try {
        const {
            productSelect,
            productId,
            sizeSelect,
            sizeName,
            newSizeName,
            quantity,
            note
        } = req.body;

        const qtyVal = parseInt(quantity, 10);
        if (isNaN(qtyVal) || qtyVal < 1) {
            req.flash('error_message', 'Quantity must be at least 1.');
            return res.redirect('/admin/inventory/import');
        }

        let targetProduct = null;
        let finalSize = '';

        if (productSelect === 'new') {
            // Case C: Create a new product
            const { name, description, price, category, supplier, imageUrl, status, lowStockThreshold } = req.body;
            
            finalSize = (newSizeName || '').trim();
            if (!finalSize) {
                req.flash('error_message', 'Please enter a size.');
                return res.redirect('/admin/inventory/import');
            }

            const imagePath = req.file ? '/uploads/' + req.file.filename : (imageUrl || '/uploads/default.jpg');
            
            targetProduct = new Product({
                name,
                description,
                price: parseFloat(price) || 0,
                category,
                supplier,
                image: imagePath,
                variants: [{ size: finalSize, quantity: qtyVal }],
                status: status === 'true',
                lowStockThreshold: parseInt(lowStockThreshold, 10) || 5
            });
            await targetProduct.save();

        } else {
            // Product exists
            targetProduct = await Product.findById(productId);
            if (!targetProduct) {
                req.flash('error_message', 'Product not found.');
                return res.redirect('/admin/inventory/import');
            }

            if (sizeSelect === 'new') {
                // Case B: Product exists + Size is new
                finalSize = (newSizeName || '').trim();
                if (!finalSize) {
                    req.flash('error_message', 'Please enter a size.');
                    return res.redirect('/admin/inventory/import');
                }

                const variantExists = targetProduct.variants.find(v => v.size === finalSize);
                if (variantExists) {
                    variantExists.quantity += qtyVal;
                } else {
                    targetProduct.variants.push({ size: finalSize, quantity: qtyVal });
                }
                await targetProduct.save();
            } else {
                // Case A: Product exists + Size exists
                finalSize = sizeName;
                const variant = targetProduct.variants.find(v => v.size === finalSize);
                if (!variant) {
                    targetProduct.variants.push({ size: finalSize, quantity: qtyVal });
                } else {
                    variant.quantity += qtyVal;
                }
                await targetProduct.save();
            }
        }

        // Generate importCode automatically: NH-YYYYMMDD-XXXX
        const today = new Date();
        const dateStr = today.getFullYear().toString() +
                        (today.getMonth() + 1).toString().padStart(2, '0') +
                        today.getDate().toString().padStart(2, '0');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const generatedCode = `NH-${dateStr}-${randomSuffix}`;

        // Create StockImport document
        const stockImport = new StockImport({
            importCode: generatedCode,
            product: targetProduct._id,
            size: finalSize,
            quantity: qtyVal,
            note: (note || '').trim() || 'Nhập hàng từ kho',
            importedBy: req.user._id
        });
        await stockImport.save();

        req.flash('success_message', 'Stock imported successfully.');
        res.redirect('/admin/inventory/overview');

    } catch (err) {
        console.error("Import Stock Error:", err);
        req.flash('error_message', 'An error occurred during stock import: ' + err.message);
        res.redirect('/admin/inventory/import');
    }
});

router.get('/report', hasRole('admin', 'store_manager'), function(req, res, next) {
    res.render('admin/inventory/report', { title: 'Inventory Report' });
});

router.get('/low-stock', hasRole('admin', 'store_manager', 'warehouse'), async function(req, res, next) {
    try {
        const products = await Product.find({}).populate('category');
        const lowStockProducts = [];

        for (const p of products) {
            const pObj = p.toObject();
            // Tính tổng tồn kho của toàn bộ các size
            const currentStock = pObj.variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
            const threshold = pObj.lowStockThreshold !== undefined ? pObj.lowStockThreshold : 5;

            // Điều kiện cảnh báo: tổng tồn kho <= ngưỡng báo động
            if (currentStock <= threshold) {
                let statusBadge = 'warning';
                let statusText = 'Low Stock';
                if (currentStock === 0) {
                    statusBadge = 'danger';
                    statusText = 'Out of Stock';
                }

                lowStockProducts.push({
                    ...pObj,
                    currentStock,
                    threshold,
                    statusText,
                    statusBadge
                });
            }
        }

        res.render('admin/inventory/low-stock', {
            title: 'Low Stock Alert',
            lowStockProducts,
            success_message: req.flash('success_message'),
            error_message: req.flash('error_message')
        });
    } catch (err) {
        next(err);
    }
});

router.post('/update-threshold/:id', hasRole('admin'), async function(req, res, next) {
    try {
        const { threshold } = req.body;
        const thresholdVal = parseInt(threshold, 10);

        if (isNaN(thresholdVal) || thresholdVal < 0) {
            req.flash('error_message', 'Threshold must be a non-negative number.');
            return res.redirect('/admin/inventory/low-stock');
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { lowStockThreshold: thresholdVal },
            { new: true }
        );

        if (!updatedProduct) {
            req.flash('error_message', 'Product not found.');
            return res.redirect('/admin/inventory/low-stock');
        }

        req.flash('success_message', `Updated threshold for "${updatedProduct.name}" to ${thresholdVal}.`);
        res.redirect('/admin/inventory/low-stock');
    } catch (err) {
        next(err);
    }
});

module.exports = router;
