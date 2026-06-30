var express = require('express');
var router = express.Router();

const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { hasRole } = require('../middlewares/authorization');

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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        const ordersToday = await Order.countDocuments({
            createdAt: {
                $gte: today
            },
            status: {
                $ne: "Cancelled"
            }
        });
        const totalCustomers = await User.countDocuments({
                role: 'customer'
            });

        const newCustomersToday =
            await User.countDocuments({
                role: "customer",
                createdAt: {
                    $gte: today
                }
            });
        const revenueResult = await Order.aggregate([
                {
                    $match: {
                        status: 'Completed'
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
        const totalRevenue = revenueResult.length > 0
                ? revenueResult[0].revenue
                : 0;

        const todayRevenueResult = await Order.aggregate([
                {
                    $match: {
                        status: 'Completed',
                        createdAt: { $gte: today }
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
        const todayRevenue = todayRevenueResult.length > 0
                ? todayRevenueResult[0].revenue
                : 0;

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const monthlyRevenueResult =
            await Order.aggregate([
                {
                    $match: {
                        status: 'Completed',
                        createdAt: { $gte: startOfMonth }
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
        const monthlyRevenue =
            monthlyRevenueResult.length > 0
                ? monthlyRevenueResult[0].revenue
                : 0;

        const startOfYear = new Date();
        startOfYear.setMonth(0);
        startOfYear.setDate(1);
        startOfYear.setHours(0, 0, 0, 0);
        const yearlyRevenueResult =
            await Order.aggregate([
                {
                    $match: {
                        status: 'Completed',
                        createdAt: { $gte: startOfYear }
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
        const yearlyRevenue =
            yearlyRevenueResult.length > 0
                ? yearlyRevenueResult[0].revenue
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
        const bestSellingProducts = (await Product.find({
            status: true
        })
            .sort({ sold: -1 })
            .limit(5)
            .lean())
            .map(product => {

                const stock = (product.variants || []).reduce(
                    (sum, variant) => sum + variant.quantity,
                    0
                );

                return {
                    ...product,
                    stock
                };
            });

        const lowStockProducts = (await Product.find({
            status: true
        })
            .lean())
            .map(product => {

                if (!product.variants || product.variants.length === 0) {
                    return null;
                }

                const lowestVariant = product.variants.reduce(
                    (min, current) =>
                        current.quantity < min.quantity
                            ? current
                            : min
                );

                return {
                    ...product,
                    stock: lowestVariant.quantity,
                    lowStockVariant: lowestVariant
                };
            })
            .filter(product =>
                product &&
                product.stock <= product.lowStockThreshold
            )
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 5);

        const recentOrders = await Order.find({})
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        // Aggregate monthly revenue for the last 12 months
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        const monthlyRevenueData = await Order.aggregate([
            {
                $match: {
                    status: 'Completed',
                    createdAt: { $gte: twelveMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    revenue: { $sum: '$totalPrice' }
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1
                }
            }
        ]);

        const labels = [];
        const revenue = [];
        const revenueMap = {};

        monthlyRevenueData.forEach(item => {
            const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
            revenueMap[key] = item.revenue;
        });

        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setDate(1); // Set to 1st of month to avoid overflow on shorter months
            d.setMonth(d.getMonth() - i);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            const key = `${year}-${String(month).padStart(2, '0')}`;
            
            labels.push(`${year}-${String(month).padStart(2, '0')}-01`);
            revenue.push(revenueMap[key] || 0);
        }

        const chartDataJSON = JSON.stringify({ labels, revenue });
        const monthlyRevenuePercentage = Math.min(Math.round((monthlyRevenue / 50000000) * 100), 100);

        res.render('admin/index', {
            title: 'Dashboard',
            totalProducts,
            totalOrders,
            ordersToday,
            totalCustomers,
            newCustomersToday,
            totalRevenue,
            todayRevenue,
            monthlyRevenue,
            yearlyRevenue,
            orderStats,
            bestSellingProducts,
            lowStockProducts,
            recentOrders,
            chartDataJSON,
            monthlyRevenuePercentage
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

router.get('/revenue', hasRole('admin'), async function(req, res, next) {
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