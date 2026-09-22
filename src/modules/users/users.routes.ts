import { Router } from 'express';
import { verifyAuth, requireAdmin } from '../../middlewares/verifyAuth';
import * as controller from './users.controller';

const router = Router();

// PUBLIC ROUTES (no JWT required)
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/activate', controller.activate);

// PROTECTED ROUTES (require JWT verification)
router.post('/refresh', controller.refreshToken);
router.get('/profile', verifyAuth, controller.profile);
router.put('/change-password', verifyAuth, controller.changePassword);
router.post('/logout', verifyAuth, controller.logout);

// ROLE MANAGEMENT ROUTES (admin only)
router.post('/:id/promote', verifyAuth, requireAdmin, controller.promote);
router.post('/:id/revoke', verifyAuth, requireAdmin, controller.revoke);

// CRUD ROUTES
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
