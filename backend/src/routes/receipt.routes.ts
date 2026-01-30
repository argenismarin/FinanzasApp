import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    uploadReceipt,
    getReceipts,
    getReceipt,
    createTransactionFromReceipt,
    deleteReceipt
} from '../controllers/receipt.controller';

const router = Router();

// Upload receipt with base64 image and process OCR in one step
router.post('/upload', authenticate, uploadReceipt);

// Get all receipts for user
router.get('/', authenticate, getReceipts);

// Get single receipt
router.get('/:id', authenticate, getReceipt);

// Create transaction from receipt data
router.post('/:id/create-transaction', authenticate, createTransactionFromReceipt);

// Delete receipt
router.delete('/:id', authenticate, deleteReceipt);

export default router;
