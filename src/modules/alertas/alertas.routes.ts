import { Router } from 'express';
import * as controller from './alertas.controller';

const router = Router();

router.get('/contagem', controller.countAbertos);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.patch('/:id/cancelar', controller.cancelar);

export default router;
