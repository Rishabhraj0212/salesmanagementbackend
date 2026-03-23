const User = require('../models/User');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -resetToken -resetTokenExpiry');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, password } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (firstName) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (password && password.length >= 6) user.password = password;

    await user.save();
    res.json({
      message: 'Profile updated',
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateLayout = async (req, res) => {
  try {
    const { cardLayout } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.cardLayout = cardLayout;
    await user.save();
    res.json({ message: 'Layout saved', cardLayout: user.cardLayout });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
