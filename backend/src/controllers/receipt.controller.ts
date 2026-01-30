import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { analyzeReceipt } from '../services/openai.service';

interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

// Upload and process receipt with base64 (serverless compatible)
export const uploadReceipt = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { imageBase64 } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'No image data provided. Send imageBase64 field.' });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        // Process OCR immediately using the service
        let ocrData;
        try {
            ocrData = await analyzeReceipt(base64Data);
        } catch (ocrError: any) {
            console.error('OCR processing error:', ocrError);
            // Create receipt with PENDING status if OCR fails
            const receipt = await prisma.receipt.create({
                data: {
                    userId,
                    imageUrl: `data:image/jpeg;base64,${base64Data.substring(0, 100)}...`, // Store truncated for reference
                    status: 'PENDING'
                }
            });
            return res.status(201).json({
                ...receipt,
                ocrError: ocrError.message || 'OCR processing failed'
            });
        }

        // Create receipt with extracted data
        const receipt = await prisma.receipt.create({
            data: {
                userId,
                imageUrl: 'base64-processed', // No file storage in serverless
                ocrData: JSON.stringify(ocrData),
                extractedAmount: ocrData.amount || null,
                extractedDate: ocrData.date ? new Date(ocrData.date) : null,
                extractedMerchant: ocrData.merchant || null,
                confidenceScore: (ocrData.confidence || 75) / 100, // Convert to 0-1 scale
                status: 'APPROVED'
            }
        });

        res.status(201).json({
            ...receipt,
            ocrData // Return parsed ocrData for immediate use
        });
    } catch (error: any) {
        console.error('Upload receipt error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Get receipts
export const getReceipts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const receipts = await prisma.receipt.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        // Parse ocrData for each receipt
        const receiptsWithParsedData = receipts.map(receipt => ({
            ...receipt,
            ocrData: receipt.ocrData ? JSON.parse(receipt.ocrData) : null
        }));

        res.json(receiptsWithParsedData);
    } catch (error) {
        console.error('Get receipts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get single receipt
export const getReceipt = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const receipt = await prisma.receipt.findFirst({
            where: { id, userId }
        });

        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        res.json({
            ...receipt,
            ocrData: receipt.ocrData ? JSON.parse(receipt.ocrData) : null
        });
    } catch (error) {
        console.error('Get receipt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create transaction from receipt data
export const createTransactionFromReceipt = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const { amount, description, date, categoryId } = req.body;

        // Get the receipt
        const receipt = await prisma.receipt.findFirst({
            where: { id, userId }
        });

        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        if (receipt.transactionId) {
            return res.status(400).json({ error: 'Transaction already created from this receipt' });
        }

        // Validate required fields
        if (!amount || !categoryId) {
            return res.status(400).json({ error: 'Amount and categoryId are required' });
        }

        // Create the transaction
        const transaction = await prisma.transaction.create({
            data: {
                userId,
                type: 'EXPENSE', // Receipts are typically expenses
                amount: parseFloat(amount),
                categoryId,
                description: description || receipt.extractedMerchant || 'Gasto desde recibo',
                date: date ? new Date(date) : (receipt.extractedDate || new Date()),
                receiptUrl: receipt.id // Link to receipt
            },
            include: {
                category: true
            }
        });

        // Update receipt with transaction link
        await prisma.receipt.update({
            where: { id },
            data: { transactionId: transaction.id }
        });

        res.status(201).json(transaction);
    } catch (error: any) {
        console.error('Create transaction from receipt error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
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
