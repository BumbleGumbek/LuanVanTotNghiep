const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const ImportRequest = require('../models/ImportRequest');
const StockImport = require('../models/StockImport');
const { hasRole } = require('../middlewares/authorization');

router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});

router.get('/', hasRole('admin', 'store_manager', 'warehouse'), async function(req, res, next) {
    try {
        const requests = await ImportRequest.find({})
            .populate('supplier')
            .populate('createdBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .lean();

        res.render('admin/import-request/index', {
            title: 'Import Requests',
            requests
        });
    } catch (err) {
        next(err);
    }
});

router.get('/create', hasRole('admin', 'store_manager'), async function(req, res, next) {
    try {
        const products = await Product.find({ status: true });
        const suppliers = await Supplier.find({ status: true });

        const plainProducts = products.map(p => {
            const pObj = p.toObject();
            pObj._idStr = p._id.toString();
            return pObj;
        });

        const plainSuppliers = suppliers.map(s => {
            const sObj = s.toObject();
            sObj._idStr = s._id.toString();
            return sObj;
        });

        let selectedProducts = [];
        const { productIds } = req.query;
        if (productIds) {
            const idList = productIds.split(',')
                .map(id => id.trim())
                .filter(id => /^[0-9a-fA-F]{24}$/.test(id));
            if (idList.length > 0) {
                const loadedProducts = await Product.find({ _id: { $in: idList } });
                selectedProducts = idList.map(id => {
                    const prod = loadedProducts.find(p => p._id.toString() === id);
                    if (prod) {
                        const pObj = prod.toObject();
                        pObj._idStr = prod._id.toString();
                        return pObj;
                    }
                    return null;
                }).filter(p => p !== null);
            }
        }

        console.log('selectedProducts length:', selectedProducts.length);

        console.log(
            selectedProducts.map(p => ({
                id: p._idStr,
                name: p.name
            }))
        );

        res.render('admin/import-request/create', {
            title: 'Create Import Request',
            plainProducts,
            plainSuppliers,
            productsJson: JSON.stringify(plainProducts),
            selectedProductsJson: selectedProducts.length > 0 ? JSON.stringify(selectedProducts) : '[]'
        });
    } catch (err) {
        next(err);
    }
});

router.get('/edit/:id', hasRole('admin', 'store_manager'), async function(req, res, next) {
    try {
        const request = await ImportRequest.findById(req.params.id)
            .populate('supplier')
            .populate('items.product')
            .lean();

        if (!request) {
            req.flash('error_message', 'Import request not found.');
            return res.redirect('/admin/import-request');
        }

        if (request.status !== 'Pending') {
            req.flash('error_message', 'Only pending requests can be edited.');
            return res.redirect('/admin/import-request');
        }

        const products = await Product.find({ status: true });
        const plainProducts = products.map(p => {
            const pObj = p.toObject();
            pObj._idStr = p._id.toString();
            return pObj;
        });

        // Format preExistingItemsJson as:
        // [{ product: "...", size: "...", quantityRequested: 10 }]
        const preExistingItems = request.items.map(item => ({
            product: item.product._id.toString(),
            size: item.size,
            quantityRequested: item.quantityRequested
        }));

        res.render('admin/import-request/edit', {
            title: `Edit Import Request - ${request.requestCode}`,
            request,
            plainProducts,
            productsJson: JSON.stringify(plainProducts),
            preExistingItemsJson: JSON.stringify(preExistingItems)
        });
    } catch (err) {
        next(err);
    }
});

router.post('/edit/:id', hasRole('admin', 'store_manager'), async function(req, res, next) {
    try {
        const request = await ImportRequest.findById(req.params.id);
        if (!request) {
            req.flash('error_message', 'Import request not found.');
            return res.redirect('/admin/import-request');
        }

        if (request.status !== 'Pending') {
            req.flash('error_message', 'Only pending requests can be edited.');
            return res.redirect('/admin/import-request');
        }

        const { items, note } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            req.flash('error_message', 'Items list cannot be empty.');
            return res.redirect(`/admin/import-request/edit/${req.params.id}`);
        }

        const validItems = [];
        for (const item of items) {
            const { product, size, quantityRequested } = item;
            if (!product || !size || !quantityRequested) {
                req.flash('error_message', 'Each item must have a product, size, and quantity.');
                return res.redirect(`/admin/import-request/edit/${req.params.id}`);
            }
            const qty = parseInt(quantityRequested, 10);
            if (isNaN(qty) || qty < 1) {
                req.flash('error_message', 'Quantity must be at least 1.');
                return res.redirect(`/admin/import-request/edit/${req.params.id}`);
            }
            validItems.push({
                product,
                size,
                quantityRequested: qty
            });
        }

        request.note = note || '';
        request.items = validItems;
        await request.save();

        req.flash('success_message', 'Import request updated successfully.');
        res.redirect(`/admin/import-request/${request._id}`);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', hasRole('admin', 'store_manager', 'warehouse'), async function(req, res, next) {
    try {
        const request = await ImportRequest.findById(req.params.id)
            .populate('supplier')
            .populate('createdBy', 'firstName lastName email')
            .populate('items.product')
            .lean();

        if (!request) {
            req.flash('error_message', 'Import request not found.');
            return res.redirect('/admin/import-request');
        }

        res.render('admin/import-request/detail', {
            title: `Import Request Details - ${request.requestCode}`,
            request
        });
    } catch (err) {
        next(err);
    }
});


router.post('/create', hasRole('admin', 'store_manager'), async function(req, res, next) {
    try {
        const { supplier, items, note } = req.body;

        // Validation
        if (!supplier) {
            req.flash('error_message', 'Supplier is required.');
            return res.redirect('/admin/import-request/create');
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            req.flash('error_message', 'Items list cannot be empty.');
            return res.redirect('/admin/import-request/create');
        }

        const validItems = [];
        for (const item of items) {
            const { product, size, quantityRequested } = item;
            if (!product || !size || !quantityRequested) {
                req.flash('error_message', 'Each item must have a product, size, and quantity.');
                return res.redirect('/admin/import-request/create');
            }
            const qty = parseInt(quantityRequested, 10);
            if (isNaN(qty) || qty < 1) {
                req.flash('error_message', 'Quantity must be at least 1.');
                return res.redirect('/admin/import-request/create');
            }
            validItems.push({
                product,
                size,
                quantityRequested: qty
            });
        }

        // Generate unique requestCode: REQ-YYYYMMDD-XXXX
        let requestCode;
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 10) {
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}${mm}${dd}`;
            const rand = Math.floor(1000 + Math.random() * 9000);
            requestCode = `REQ-${dateStr}-${rand}`;
            
            const existing = await ImportRequest.findOne({ requestCode });
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            throw new Error('Could not generate a unique request code. Please try again.');
        }

        const newRequest = new ImportRequest({
            requestCode,
            supplier,
            items: validItems,
            status: 'Pending',
            createdBy: req.user ? req.user._id : null,
            note: note || ''
        });

        await newRequest.save();

        req.flash('success_message', 'Import request created successfully.');
        res.redirect('/admin/import-request');
    } catch (err) {
        console.error("Error creating import request:", err);
        req.flash('error_message', err.message || 'Error occurred while creating import request.');
        res.redirect('/admin/import-request/create');
    }
});

router.delete('/:id', hasRole('admin', 'store_manager'), async function(req, res, next) {
    try {
        const request = await ImportRequest.findById(req.params.id);
        if (!request) {
            req.flash('error_message', 'Import request not found.');
            return res.redirect('/admin/import-request');
        }

        if (request.status !== 'Pending') {
            req.flash('error_message', 'Only pending requests can be deleted.');
            return res.redirect('/admin/import-request');
        }

        await ImportRequest.deleteOne({ _id: req.params.id });

        req.flash('success_message', 'Import request deleted successfully.');
        res.redirect('/admin/import-request');
    } catch (err) {
        next(err);
    }
});

router.post('/import/:id', hasRole('admin', 'warehouse'), async function(req, res, next) {
    try {
        const request = await ImportRequest.findById(req.params.id);
        if (!request) {
            req.flash('error_message', 'Import request not found.');
            return res.redirect('/admin/import-request');
        }

        if (request.status !== 'Delivered') {
            req.flash('error_message', 'Only delivered requests can be imported.');
            return res.redirect(`/admin/import-request/${request._id}`);
        }

        for (const item of request.items) {
            const product = await Product.findById(item.product);
            if (!product) {
                throw new Error(`Product not found: ${item.product}`);
            }

            const variant = product.variants.find(
                v => v.size === item.size
            );

            if (variant) {
                variant.quantity += item.quantityRequested;
            } else {
                product.variants.push({
                    size: item.size,
                    quantity: item.quantityRequested
                });
            }
            await product.save();

            // Generate importCode: NH-YYYYMMDD-XXXX
            const today = new Date();
            const dateStr = today.getFullYear().toString() +
                            (today.getMonth() + 1).toString().padStart(2, '0') +
                            today.getDate().toString().padStart(2, '0');
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const generatedCode = `NH-${dateStr}-${randomSuffix}`;

            // Create StockImport document
            const stockImport = new StockImport({
                importCode: generatedCode,
                product: product._id,
                size: item.size,
                quantity: item.quantityRequested,
                note: `Nhập hàng từ Request ${request.requestCode}`,
                importedBy: req.user._id
            });
            await stockImport.save();
        }

        request.status = 'Completed';
        await request.save();

        req.flash('success_message', 'Stock imported successfully.');
        res.redirect(`/admin/import-request/${request._id}`);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
