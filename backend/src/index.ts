import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';

// Import routes
import authRoutes from './routes/auth.routes';
import transactionRoutes from './routes/transaction.routes';
import categoryRoutes from './routes/category.routes';
import budgetRoutes from './routes/budget.routes';
import goalRoutes from './routes/goal.routes';
import reminderRoutes from './routes/reminder.routes';
import accountRoutes from './routes/account.routes';
import receiptRoutes from './routes/receipt.routes';
import checklistRoutes from './routes/checklist.routes';
import analyticsRoutes from './routes/analytics.routes';
import debtRoutes from './routes/debt.routes';
import savingRoutes from './routes/saving.routes';
import balanceRoutes from './routes/balance.routes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check endpoints
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Info
app.get('/api', (req: Request, res: Response) => {
    res.json({
        message: 'FinanzasApp API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth/*',
            transactions: '/api/transactions/*',
            categories: '/api/categories/*',
            budgets: '/api/budgets/*',
            goals: '/api/goals/*',
            reminders: '/api/reminders/*',
            accounts: '/api/accounts/*',
            receipts: '/api/receipts/*',
            checklist: '/api/checklist/*',
            analytics: '/api/analytics/*'
        }
    });
});

// Serve uploaded files (only works locally, not in Vercel)
if (!process.env.VERCEL) {
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/savings', savingRoutes);
app.use('/api/balance', balanceRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server (only when not in Vercel)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📝 Environment: ${process.env.NODE_ENV}`);
        console.log(`🔗 API: http://localhost:${PORT}/api`);
        console.log(`💾 Database: Connected`);
        console.log(`✅ Routes: Auth, Transactions, Categories, Budgets, Goals, Reminders, Accounts, Receipts, Checklist, Analytics`);
        console.log(`📸 OCR: OpenAI Vision API enabled`);
    });
}

export default app;
