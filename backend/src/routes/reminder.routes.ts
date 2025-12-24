import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as reminderController from '../controllers/reminder.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', reminderController.getPaymentReminders);
router.get('/upcoming', reminderController.getUpcomingPayments);
router.post('/', reminderController.createPaymentReminder);
router.post('/:id/mark-paid', reminderController.markAsPaid);
router.put('/:id', reminderController.updatePaymentReminder);
router.delete('/:id', reminderController.deletePaymentReminder);

export default router;
