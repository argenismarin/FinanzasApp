import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    exportTransactionsCSV,
    exportMonthlyReport,
    exportDebtsCSV,
    exportBudgetsCSV,
    exportCreditCardsCSV,
    exportTransfersCSV,
    exportSavingsCSV,
    exportRecurringCSV,
    exportChecklistCSV
} from '../controllers/export.controller';

const router = Router();

router.get('/transactions/csv', authenticate, exportTransactionsCSV);
router.get('/monthly-report', authenticate, exportMonthlyReport);
router.get('/debts/csv', authenticate, exportDebtsCSV);
router.get('/budgets/csv', authenticate, exportBudgetsCSV);
router.get('/credit-cards/csv', authenticate, exportCreditCardsCSV);
router.get('/transfers/csv', authenticate, exportTransfersCSV);
router.get('/savings/csv', authenticate, exportSavingsCSV);
router.get('/recurring/csv', authenticate, exportRecurringCSV);
router.get('/checklist/csv', authenticate, exportChecklistCSV);

export default router;

