import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    uploadReceipt,
    getReceipts,
    processReceipt,
    deleteReceipt,
    upload
} from '../controllers/receipt.controller';

const router = Router();

router.post('/upload', authenticate, upload.single('receipt'), uploadReceipt);
router.get('/', authenticate, getReceipts);
router.post('/:id/process', authenticate, processReceipt);
router.delete('/:id', authenticate, deleteReceipt);

export default router;
