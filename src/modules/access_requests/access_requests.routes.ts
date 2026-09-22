import { Router } from 'express';
import { verifyAuth, requireAdmin } from '../../middlewares/verifyAuth';
import * as controller from './access_requests.controller';

const router = Router();

// Rota pública para solicitação de acesso
router.post('/', controller.create);

// Rotas administrativas (requer JWT e role de admin)
router.get('/', verifyAuth, requireAdmin, controller.getAll);
router.get('/:id', verifyAuth, requireAdmin, controller.getById);
router.post('/:id/approve', verifyAuth, requireAdmin, controller.approve);
router.post('/:id/reject', verifyAuth, requireAdmin, controller.reject);

export default router;
