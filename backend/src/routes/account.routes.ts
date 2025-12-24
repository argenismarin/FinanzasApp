import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as accountController from '../controllers/account.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', accountController.getBankAccounts);
router.get('/:id', accountController.getBankAccount);
router.post('/', accountController.createBankAccount);
router.post('/transfer', accountController.transferBetweenAccounts);
router.put('/:id', accountController.updateBankAccount);
router.delete('/:id', accountController.deleteBankAccount);

export default router;
