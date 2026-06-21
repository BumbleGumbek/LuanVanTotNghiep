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
        const orderStatsResult =
            await Order.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);
        const orderStats = {
            PendingPayment: 0,
            Paid: 0,
            Shipping: 0,
            Completed: 0,
            Cancelled: 0
        };
        orderStatsResult.forEach(item => {
            orderStats[item._id] = item.count;
        });
        const bestSellingProducts = await Product.find({})
                .sort({ sold: -1 })
                .limit(5);

        const lowStockProductsRaw = await Product.find({})
                .limit(5);

        const lowStockProducts =
            (await Product.find({}))
                .map(product => {
                    const obj = product.toObject();
                    obj.stock =
                        obj.variants.reduce(
                            (sum, variant) =>
                                sum + variant.quantity,
                            0
                        );

                    return obj;
                })
                .filter(product =>
                    product.stock <= 5
                )
                .sort((a, b) =>
                    a.stock - b.stock
                )
                .slice(0, 5);

        const recentOrders = await Order.find({}).populate(
            'user', 'firstName lastName'
                )
                .sort({
                    createdAt: -1
                })
                .limit(5);

        res.render('admin/index', {
            title: 'Dashboard',
            totalProducts,
            totalOrders,
            totalCustomers,
            totalRevenue,
            orderStats,
            bestSellingProducts:
                bestSellingProducts.map(
                    p => p.toObject()
                ),
            lowStockProducts,
            recentOrders:
                recentOrders.map(
                    order => order.toObject()
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

router.get('/revenue', async function(req, res, next) {
    try {
        const revenueByMonth =
            await Order.aggregate([
                {
                    $match: {
                        status: 'Completed'
                    }
                },
                {
                    $group: {
                        _id: {
                            month: {
                                $month: "$createdAt"
                            },
                            year: {
                                $year: "$createdAt"
                            }
                        },
                        revenue: {
                            $sum: "$totalPrice"
                        },
                        orders: {
                            $sum: 1
                        }
                    }
                },
                {
                    $sort: {
                        "_id.year": -1,
                        "_id.month": -1
                    }
                }
            ]);
        res.render(
            'admin/revenue/index',
            {
                title: 'Revenue Report',
                revenueByMonth
            }
        );
    } catch(err) {
        next(err);
    }
});

module.exports = router;