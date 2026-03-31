import { Router } from 'express';
import usersRoutes from '../modules/users/users.routes';
import cargaRoutes from '../modules/carga/carga.routes';
import centroLogisticaRoutes from '../modules/centro_logistica/centro_logistica.routes';
import clientesRoutes from '../modules/clientes/clientes.routes';
import armazensRoutes from '../modules/armazens_parceiros/armazens_parceiros.routes';
import caminhaoRoutes from '../modules/caminhao/caminhao.routes';
import entregasRoutes from '../modules/entregas/entregas.routes';

const router = Router();

router.use('/users', usersRoutes);
router.use('/carga', cargaRoutes);
router.use('/centros-logistica', centroLogisticaRoutes);
router.use('/clientes', clientesRoutes);
router.use('/armazens', armazensRoutes);
router.use('/caminhoes', caminhaoRoutes);
router.use('/entregas', entregasRoutes);

export default router;
