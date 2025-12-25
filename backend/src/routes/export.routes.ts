import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    exportTransactionsCSV,
    exportMonthlyReport,
    exportDebtsCSV,
    exportBudgetsCSV
} from '../controllers/export.controller';

const router = Router();

router.get('/transactions/csv', authenticate, exportTransactionsCSV);
router.get('/monthly-report', authenticate, exportMonthlyReport);
router.get('/debts/csv', authenticate, exportDebtsCSV);
router.get('/budgets/csv', authenticate, exportBudgetsCSV);

export default router;

