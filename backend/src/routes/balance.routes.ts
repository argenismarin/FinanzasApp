import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getBalance, recalculateBalances } from '../controllers/balance.controller';

const router = Router();

router.get('/', authenticate, getBalance);

// Recalcula saldos desde las transacciones — recovery tool
// Acceso: USER (sus cuentas) o ADMIN (cualquier userId vía ?userId=)
router.post('/recalculate', authenticate, recalculateBalances);

export default router;
