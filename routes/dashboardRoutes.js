const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', dashboardController.getDashboard);
router.get('/chart', dashboardController.getChartData);
router.get('/stats', dashboardController.getStats);

module.exports = router;
