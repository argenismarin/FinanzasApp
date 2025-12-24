import { Router } from 'express';
import {
    getChecklistItems,
    createChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
} from '../controllers/checklist.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getChecklistItems);
router.post('/', createChecklistItem);
router.post('/:id/toggle', toggleChecklistItem);
router.delete('/:id', deleteChecklistItem);

export default router;
