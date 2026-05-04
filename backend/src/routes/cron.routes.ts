import { Router } from 'express';
import { handleCronJob } from '../controllers/cron.controller';

const router = Router();

// No authenticate middleware - auth is done inside the controller via CRON_SECRET
router.post('/execute', handleCronJob);

export default router;
