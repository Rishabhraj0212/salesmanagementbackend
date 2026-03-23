const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Invoice = require('../models/Invoice');

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.userId;
    const userObjectId = require('mongoose').Types.ObjectId.createFromHexString(userId);

    const [
      salesStats,
      purchaseStats,
      totalProducts,
      lowStockCount,
      outOfStockCount,
      totalItemsAggr,
      categories,
      topProducts
    ] = await Promise.all([
      // Sales Overview
      Sale.aggregate([
        { $match: { user: userObjectId, type: 'sale' } },
        { $group: { _id: null, totalValue: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      // Purchase Overview
      Sale.aggregate([
        { $match: { user: userObjectId, type: 'purchase' } },
        { $group: { _id: null, totalValue: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      // Inventory Summary
      Product.countDocuments({ user: userId }),
      Product.countDocuments({ user: userId, status: 'Low Stock' }),
      Product.countDocuments({ user: userId, status: 'Out of Stock' }),
      Product.aggregate([
        { $match: { user: userObjectId } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]),
      // Categories
      Product.distinct('category', { user: userId }),
      // Top selling products
      Sale.aggregate([
        { $match: { user: userObjectId, type: 'sale' } },
        { $group: { _id: '$productName', totalSold: { $sum: '$quantity' }, totalAmount: { $sum: '$amount' } } },
        { $sort: { totalSold: -1 } },
        { $limit: 5 }
      ])
    ]);

    const totalSalesValue = salesStats[0] ? salesStats[0].totalValue : 0;
    const salesCount = salesStats[0] ? salesStats[0].count : 0;

    const totalPurchaseValue = purchaseStats[0] ? purchaseStats[0].totalValue : 0;
    const purchaseCount = purchaseStats[0] ? purchaseStats[0].count : 0;

    const totalItems = totalItemsAggr[0] ? totalItemsAggr[0].total : 0;

    res.json({
      salesOverview: { totalValue: totalSalesValue, count: salesCount },
      purchaseOverview: { totalValue: totalPurchaseValue, count: purchaseCount },
      inventorySummary: {
        totalItems,
        lowStockCount,
        outOfStockCount
      },
      productSummary: { totalProducts, categoriesCount: categories.length },
      topProducts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getChartData = async (req, res) => {
  try {
    const userId = req.userId;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const userObjectId = require('mongoose').Types.ObjectId.createFromHexString(userId);

    const aggregateData = await Sale.aggregate([
      {
        $match: {
          user: userObjectId,
          date: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      }
    ]);

    const chartData = months.map((month) => ({
      month,
      sales: 0,
      purchases: 0
    }));

    aggregateData.forEach((item) => {
      const monthIndex = item._id.month - 1; // $month returns 1-12
      if (monthIndex >= 0 && monthIndex < 12) {
        if (item._id.type === 'sale') {
          chartData[monthIndex].sales += item.total;
        } else if (item._id.type === 'purchase') {
          chartData[monthIndex].purchases += item.total;
        }
      }
    });

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const userId = req.userId;
    const userObjectId = require('mongoose').Types.ObjectId.createFromHexString(userId);

    const [salesAggr, totalInStockAggr] = await Promise.all([
      Sale.aggregate([
        { $match: { user: userObjectId, type: 'sale' } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' }, totalQuantity: { $sum: '$quantity' } } }
      ]),
      Product.aggregate([
        { $match: { user: userObjectId } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ])
    ]);

    res.json({
      totalRevenue: salesAggr[0]?.totalAmount || 0,
      productsSold: salesAggr[0]?.totalQuantity || 0,
      productsInStock: totalInStockAggr[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
