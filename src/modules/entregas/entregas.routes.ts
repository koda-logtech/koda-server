import { Router } from 'express';
import * as controller from './entregas.controller';

const router = Router();

router.get('/completo', controller.getAllCompleto);
router.get('/:id/completo', controller.getByIdCompleto);
router.get('/:id/direction', controller.getDirection);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
