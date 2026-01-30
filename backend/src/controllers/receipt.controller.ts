import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';
import prisma from '../lib/prisma';
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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
        // In Vercel/serverless, use /tmp directory which is writable
        const dir = process.env.VERCEL ? '/tmp/receipts' : 'uploads/receipts';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
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
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only images (JPEG, JPG, PNG) are allowed'));
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

        // Store the relative path that will be served by Express
        const imageUrl = `/uploads/receipts/${file.filename}`;

        const receipt = await prisma.receipt.create({
            data: {
                userId,
                imageUrl,
                status: 'PENDING'
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
            orderBy: { createdAt: 'desc' }
        });

        res.json(receipts);
    } catch (error) {
        console.error('Get receipts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Process receipt with OCR using OpenAI Vision
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

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        // Construct the full file path from imageUrl
        const filePath = path.join(process.cwd(), 'uploads', 'receipts', path.basename(receipt.imageUrl));

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Receipt image file not found' });
        }

        // Read the image file
        const imageBuffer = fs.readFileSync(filePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = 'image/jpeg'; // Default to jpeg for uploaded images

        // Call OpenAI Vision API
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analiza esta factura/recibo y extrae la siguiente información en formato JSON:
{
  "merchant": "nombre del comercio o negocio",
  "amount": "monto total (solo el número, sin símbolos)",
  "currency": "moneda (COP, USD, EUR, etc)",
  "date": "fecha en formato ISO (YYYY-MM-DD)",
  "items": [
    {
      "description": "nombre del producto/servicio",
      "quantity": "cantidad",
      "price": "precio unitario"
    }
  ],
  "category": "categoría sugerida (Alimentación, Transporte, Entretenimiento, Salud, etc)"
}

Si no encuentras algún dato, usa valores razonables o null. Responde SOLO con el JSON, sin texto adicional.`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        // Parse the JSON response
        let ocrData;
        try {
            // Remove markdown code blocks if present
            const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            ocrData = JSON.parse(cleanContent);
        } catch (parseError) {
            console.error('Error parsing OpenAI response:', content);
            throw new Error('Failed to parse OCR response');
        }

        // Extract structured data for database fields
        const extractedAmount = ocrData.amount ? parseFloat(ocrData.amount) : null;
        const extractedDate = ocrData.date ? new Date(ocrData.date) : null;
        const extractedMerchant = ocrData.merchant || null;

        // Update receipt with OCR data
        const updated = await prisma.receipt.update({
            where: { id },
            data: {
                ocrData: ocrData as any,
                extractedAmount: extractedAmount,
                extractedDate: extractedDate,
                extractedMerchant: extractedMerchant,
                confidenceScore: 0.95,
                status: 'APPROVED'
            }
        });

        res.json(updated);
    } catch (error: any) {
        console.error('Process receipt error:', error);
        res.status(500).json({
            error: 'Error processing receipt',
            details: error.message
        });
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

        // Delete the file
        const filePath = path.join(process.cwd(), 'uploads', 'receipts', path.basename(receipt.imageUrl));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await prisma.receipt.delete({ where: { id } });
        res.json({ message: 'Receipt deleted successfully' });
    } catch (error) {
        console.error('Delete receipt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
