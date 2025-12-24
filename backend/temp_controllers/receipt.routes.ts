import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
    uploadReceipt,
    createTransactionFromReceipt,
    getReceipts,
} from '../controllers/receipt.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, process.env.UPLOAD_DIR || './uploads');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

// All routes require authentication
router.use(authenticate);

router.post('/upload', upload.single('receipt'), uploadReceipt);
router.post('/create-transaction', createTransactionFromReceipt);
router.get('/', getReceipts);

export default router;
