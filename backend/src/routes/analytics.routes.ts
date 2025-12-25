import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
    getAnalyticsOverview,
    getCategoryBreakdown,
    getTopCategories
} from '../controllers/analytics.controller';

const router = Router();

router.get('/overview', authenticate, getAnalyticsOverview);
router.get('/categories', authenticate, getCategoryBreakdown);
router.get('/top-categories', authenticate, getTopCategories);

export default router;
