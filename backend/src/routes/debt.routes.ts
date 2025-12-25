import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getDebts,
    createDebt,
    updateDebt,
    payDebt,
    deleteDebt
} from '../controllers/debt.controller';

const router = Router();

router.get('/', authenticate, getDebts);
router.post('/', authenticate, createDebt);
router.put('/:id', authenticate, updateDebt);
router.patch('/:id/pay', authenticate, payDebt);
router.delete('/:id', authenticate, deleteDebt);

export default router;
