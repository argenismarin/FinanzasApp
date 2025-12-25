import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/receipts/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only images and PDFs are allowed'));
        }
    }
});

// Upload receipt
export const uploadReceipt = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const receipt = await prisma.receipt.create({
            data: {
                userId,
                filename: file.filename,
                originalName: file.originalname,
                filePath: file.path,
                fileSize: file.size,
                mimeType: file.mimetype
            }
        });

        res.status(201).json(receipt);
    } catch (error) {
        console.error('Upload receipt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get receipts
export const getReceipts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const receipts = await prisma.receipt.findMany({
            where: { userId },
            include: { transaction: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json(receipts);
    } catch (error) {
        console.error('Get receipts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Process receipt with OCR (placeholder)
export const processReceipt = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const receipt = await prisma.receipt.findFirst({
            where: { id, userId }
        });

        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        // Placeholder OCR data - in production, integrate with OCR service
        const ocrData = {
            amount: 0,
            date: new Date(),
            merchant: 'Unknown',
            items: []
        };

        const updated = await prisma.receipt.update({
            where: { id },
            data: {
                ocrData: ocrData as any,
                isProcessed: true
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Process receipt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete receipt
export const deleteReceipt = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const receipt = await prisma.receipt.findFirst({
            where: { id, userId }
        });

        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        await prisma.receipt.delete({ where: { id } });
        res.json({ message: 'Receipt deleted successfully' });
    } catch (error) {
        console.error('Delete receipt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
