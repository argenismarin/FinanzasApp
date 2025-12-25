import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getBalance } from '../controllers/balance.controller';

const router = Router();

router.get('/', authenticate, getBalance);

export default router;
