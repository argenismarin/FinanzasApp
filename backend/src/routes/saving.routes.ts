import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getSavings,
    createSaving,
    updateSaving,
    deleteSaving,
    withdrawFromSaving
} from '../controllers/saving.controller';

const router = Router();

router.get('/', authenticate, getSavings);
router.post('/', authenticate, createSaving);
router.put('/:id', authenticate, updateSaving);
router.patch('/:id/withdraw', authenticate, withdrawFromSaving);
router.delete('/:id', authenticate, deleteSaving);

export default router;
