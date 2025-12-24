import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as goalController from '../controllers/goal.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', goalController.getSavingsGoals);
router.get('/:id', goalController.getSavingsGoal);
router.post('/', goalController.createSavingsGoal);
router.post('/:id/contribute', goalController.contributeToGoal);
router.put('/:id', goalController.updateSavingsGoal);
router.delete('/:id', goalController.deleteSavingsGoal);

export default router;
