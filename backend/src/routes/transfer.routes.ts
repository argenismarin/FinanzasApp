import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getTransfers,
    createTransfer,
    deleteTransfer,
    getAccountsForTransfer
} from '../controllers/transfer.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener cuentas disponibles para transferir
router.get('/accounts', getAccountsForTransfer);

// CRUD de transferencias
router.get('/', getTransfers);
router.post('/', createTransfer);
router.delete('/:id', deleteTransfer);

export default router;
