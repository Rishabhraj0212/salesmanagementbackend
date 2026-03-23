const Invoice = require('../models/Invoice');

exports.getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const matchQuery = { user: req.userId };
    if (search) {
      matchQuery.$or = [
        { invoiceId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Invoice.countDocuments(matchQuery);
    const invoices = await Invoice.find(matchQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ invoices, total, pages: Math.ceil(total / limit), currentPage: parseInt(page) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getInvoiceStats = async (req, res) => {
  try {
    const userId = req.userId;
    const totalInvoices = await Invoice.countDocuments({ user: userId });
    const paidInvoices = await Invoice.find({ user: userId, status: 'Paid' });
    const unpaidInvoices = await Invoice.find({ user: userId, status: 'Unpaid' });

    const paidAmount = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const unpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    // Recent (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentInvoices = await Invoice.countDocuments({ user: userId, createdAt: { $gte: sevenDaysAgo } });

    // Recent transactions (last 5)
    const recentTransactions = await Invoice.find({ user: userId })
      .sort({ createdAt: -1 }).limit(5);

    res.json({
      totalInvoices,
      recentInvoices,
      paidCount: paidInvoices.length,
      unpaidCount: unpaidInvoices.length,
      paidAmount,
      unpaidAmount,
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.userId });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    invoice.status = status;
    await invoice.save();
    res.json({ message: `Invoice marked as ${status}`, invoice });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.userId });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
