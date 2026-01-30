import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getCreditCards,
    getCreditCard,
    createCreditCard,
    updateCreditCard,
    deleteCreditCard,
    addCreditCardTransaction,
    addCreditCardPayment,
    getCreditCardsSummary
} from '../controllers/credit-cards.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Resumen general de tarjetas
router.get('/summary', getCreditCardsSummary);

// CRUD de tarjetas
router.get('/', getCreditCards);
router.get('/:id', getCreditCard);
router.post('/', createCreditCard);
router.put('/:id', updateCreditCard);
router.delete('/:id', deleteCreditCard);

// Transacciones de tarjeta
router.post('/:id/transactions', addCreditCardTransaction);

// Pagos de tarjeta
router.post('/:id/payments', addCreditCardPayment);

export default router;
