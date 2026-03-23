const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/profile', settingsController.getProfile);
router.put('/profile', settingsController.updateProfile);
router.put('/layout', settingsController.updateLayout);

module.exports = router;
