import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getRules,
    createRule,
    updateRule,
    deleteRule,
    suggestCategory
} from '../controllers/categorization-rule.controller';

const router = Router();

router.use(authenticate);

router.get('/', getRules);
router.post('/', createRule);
router.post('/suggest', suggestCategory);
router.put('/:id', updateRule);
router.delete('/:id', deleteRule);

export default router;
