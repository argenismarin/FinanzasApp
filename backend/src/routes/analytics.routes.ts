import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getAnalyticsOverview,
    getCategoryBreakdown,
    getTopCategories,
    getDashboardStats,
    getFinancialReport
} from '../controllers/analytics.controller';

const router = Router();

router.get('/overview', authenticate, getAnalyticsOverview);
router.get('/categories', authenticate, getCategoryBreakdown);
router.get('/top-categories', authenticate, getTopCategories);
router.get('/dashboard', authenticate, getDashboardStats);
router.get('/report', authenticate, getFinancialReport);

export default router;
