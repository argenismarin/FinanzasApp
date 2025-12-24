import { Router } from 'express';
import {
    getMonthlyTrend,
    getCategoryBreakdown,
    getTopCategories,
} from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/monthly-trend', getMonthlyTrend);
router.get('/category-breakdown', getCategoryBreakdown);
router.get('/top-categories', getTopCategories);

export default router;
