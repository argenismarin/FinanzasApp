import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getAnalyticsOverview,
    getCategoryBreakdown,
    getTopCategories,
    getDashboardStats,
    getFinancialReport,
    getForecast,
    getAdvancedAnalytics
} from '../controllers/analytics.controller';

const router = Router();

router.get('/overview', authenticate, getAnalyticsOverview);
router.get('/categories', authenticate, getCategoryBreakdown);
router.get('/top-categories', authenticate, getTopCategories);
router.get('/dashboard', authenticate, getDashboardStats);
router.get('/report', authenticate, getFinancialReport);
router.get('/forecast', authenticate, getForecast);
router.get('/advanced', authenticate, getAdvancedAnalytics);

export default router;
