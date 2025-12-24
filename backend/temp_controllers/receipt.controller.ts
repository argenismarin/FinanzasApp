import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { analyzeReceipt } from '../services/openai.service';
import fs from 'fs/promises';
import path from 'path';

export const uploadReceipt = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const userId = req.user!.id;
        const filePath = req.file.path;

        // Read file as base64
        const imageBuffer = await fs.readFile(filePath);
        const imageBase64 = imageBuffer.toString('base64');

        // Analyze with OpenAI
        const receiptData = await analyzeReceipt(imageBase64);

        // Find or suggest category
        let categoryId = null;
        if (receiptData.category) {
            const category = await prisma.category.findFirst({
                where: {
                    name: {
                        contains: receiptData.category,
                    },
                    OR: [{ userId: null }, { userId }],
                },
            });
            categoryId = category?.id || null;
        }

        // Save receipt record
        const receipt = await prisma.receipt.create({
            data: {
                userId,
                imageUrl: `/uploads/${req.file.filename}`,
                ocrData: receiptData as any,
                processedAt: new Date(),
            },
        });

        res.json({
            receipt,
            extractedData: {
                ...receiptData,
                suggestedCategoryId: categoryId,
            },
        });
    } catch (error) {
        console.error('Upload receipt error:', error);
        res.status(500).json({ error: 'Failed to process receipt' });
    }
};

export const createTransactionFromReceipt = async (req: AuthRequest, res: Response) => {
    try {
        const { receiptId, amount, categoryId, description, date } = req.body;
        const userId = req.user!.id;

        // Verify receipt belongs to user
        const receipt = await prisma.receipt.findUnique({
            where: { id: receiptId },
        });

        if (!receipt || receipt.userId !== userId) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        // Create transaction
        const transaction = await prisma.transaction.create({
            data: {
                userId,
                type: 'EXPENSE',
                amount: parseFloat(amount),
                currency: 'COP',
                categoryId,
                description,
                date: new Date(date),
                createdBy: userId,
            },
            include: {
                category: true,
            },
        });

        // Link receipt to transaction
        await prisma.receipt.update({
            where: { id: receiptId },
            data: { transactionId: transaction.id },
        });

        res.json(transaction);
    } catch (error) {
        console.error('Create transaction from receipt error:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
};

export const getReceipts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const receipts = await prisma.receipt.findMany({
            where: { userId },
            include: {
                transaction: {
                    include: {
                        category: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(receipts);
    } catch (error) {
        console.error('Get receipts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
