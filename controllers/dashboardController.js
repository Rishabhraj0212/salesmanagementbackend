const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Invoice = require('../models/Invoice');

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.userId;

    // Sales Overview
    const sales = await Sale.find({ user: userId, type: 'sale' });
    const totalSalesValue = sales.reduce((sum, s) => sum + s.amount, 0);
    const salesCount = sales.length;

    // Purchase Overview (treating all as purchases for simulation)
    const purchases = await Sale.find({ user: userId, type: 'purchase' });
    const totalPurchaseValue = purchases.reduce((sum, s) => sum + s.amount, 0);
    const purchaseCount = purchases.length;

    // Inventory Summary
    const totalProducts = await Product.countDocuments({ user: userId });
    const lowStockCount = await Product.countDocuments({ user: userId, status: 'Low Stock' });
    const outOfStockCount = await Product.countDocuments({ user: userId, status: 'Out of Stock' });
    const totalItems = await Product.aggregate([
      { $match: { user: require('mongoose').Types.ObjectId.createFromHexString(userId) } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    // Categories
    const categories = await Product.distinct('category', { user: userId });

    // Top selling products
    const topProducts = await Sale.aggregate([
      { $match: { user: require('mongoose').Types.ObjectId.createFromHexString(userId), type: 'sale' } },
      { $group: { _id: '$productName', totalSold: { $sum: '$quantity' }, totalAmount: { $sum: '$amount' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      salesOverview: { totalValue: totalSalesValue, count: salesCount },
      purchaseOverview: { totalValue: totalPurchaseValue, count: purchaseCount },
      inventorySummary: {
        totalItems: totalItems[0]?.total || 0,
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

    const chartData = [];
    for (let i = 0; i < 12; i++) {
      const startOfMonth = new Date(currentYear, i, 1);
      const endOfMonth = new Date(currentYear, i + 1, 0, 23, 59, 59);

      const monthlySales = await Sale.aggregate([
        {
          $match: {
            user: require('mongoose').Types.ObjectId.createFromHexString(userId),
            type: 'sale',
            date: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const monthlyPurchases = await Sale.aggregate([
        {
          $match: {
            user: require('mongoose').Types.ObjectId.createFromHexString(userId),
            type: 'purchase',
            date: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      chartData.push({
        month: months[i],
        sales: monthlySales[0]?.total || 0,
        purchases: monthlyPurchases[0]?.total || 0
      });
    }

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const userId = req.userId;

    const totalRevenue = await Sale.aggregate([
      { $match: { user: require('mongoose').Types.ObjectId.createFromHexString(userId), type: 'sale' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const productsSold = await Sale.aggregate([
      { $match: { user: require('mongoose').Types.ObjectId.createFromHexString(userId), type: 'sale' } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    const totalInStock = await Product.aggregate([
      { $match: { user: require('mongoose').Types.ObjectId.createFromHexString(userId) } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      productsSold: productsSold[0]?.total || 0,
      productsInStock: totalInStock[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
