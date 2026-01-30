import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getRecurringTransactions,
    createRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    executeRecurringTransaction,
    getPendingRecurringTransactions,
    executeAllPendingRecurring
} from '../controllers/recurring.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// CRUD de transacciones recurrentes
router.get('/', getRecurringTransactions);
router.post('/', createRecurringTransaction);
router.put('/:id', updateRecurringTransaction);
router.delete('/:id', deleteRecurringTransaction);

// Ejecución manual
router.post('/:id/execute', executeRecurringTransaction);

// Obtener y ejecutar pendientes
router.get('/pending', getPendingRecurringTransactions);
router.post('/execute-all', executeAllPendingRecurring);

export default router;
