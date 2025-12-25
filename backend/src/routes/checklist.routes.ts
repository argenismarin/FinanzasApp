import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getChecklistItems,
    createChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem
} from '../controllers/checklist.controller';

const router = Router();

router.get('/', authenticate, getChecklistItems);
router.post('/', authenticate, createChecklistItem);
router.patch('/:id/toggle', authenticate, toggleChecklistItem);
router.delete('/:id', authenticate, deleteChecklistItem);

export default router;
