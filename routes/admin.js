var express = require('express');
var router = express.Router();

const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');

function useAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/login');
    }
}

router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});

/* GET home page. */
router.get('/', async function(req, res, next) {
    try {
        const totalProducts =
            await Product.countDocuments();
        const totalOrders =
            await Order.countDocuments();
        const totalCustomers =
            await User.countDocuments({
                role: 'customer'
            });
        const revenueResult =
            await Order.aggregate([
                {
                    $match: {
                        status: 'Delivered'
                    }
                },
                {
                    $group: {
                        _id: null,
                        revenue: {
                            $sum: '$totalPrice'
                        }
                    }
                }
            ]);
        const totalRevenue =
            revenueResult.length > 0
                ? revenueResult[0].revenue
                : 0;
        const bestSellingProducts =
            await Product.find({})
                .sort({ sold: -1 })
                .limit(5);

        res.render('admin/index', {
            title: 'Dashboard',
            totalProducts,
            totalOrders,
            totalCustomers,
            totalRevenue,
            bestSellingProducts:
                bestSellingProducts.map(
                    p => p.toObject()
                )
        });
    } catch (err) {
        next(err);
    }
});

/* GET profile settings */
router.get('/profile', async function(req, res, next) {
    try {
        res.render('admin/profile/settings', {
            title: 'Profile Settings',
            user: req.user.toObject()
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;