import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as budgetController from '../controllers/budget.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', budgetController.getBudgets);
router.get('/progress', budgetController.getBudgetProgress);
router.post('/', budgetController.createBudget);
router.put('/:id', budgetController.updateBudget);
router.delete('/:id', budgetController.deleteBudget);

export default router;
