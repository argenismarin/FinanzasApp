import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    askFinancialAdvice,
    analyzeSpending,
    getBudgetSuggestion
} from '../controllers/ai.controller';

const router = Router();

router.post('/advice', authenticate, askFinancialAdvice);
router.get('/analyze-spending', authenticate, analyzeSpending);
router.post('/suggest-budget', authenticate, getBudgetSuggestion);

export default router;

