import { Request, Response } from 'express';
import { HTTP_STATUS, PAGINATION } from '../../utils/constants';
import * as service from './alertas.service';

function parseId(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export const getAll = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT,
  );

  const filters = {
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    tipo: typeof req.query.tipo === 'string' ? req.query.tipo : undefined,
    id_carga:
      req.query.id_carga != null && req.query.id_carga !== ''
        ? Number(req.query.id_carga)
        : undefined,
  };

  const { data, error } = await service.findAll(page, limit, filters);
  if (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    return;
  }
  res.json(data ?? []);
};

export const getById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id == null) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID inválido' });
    return;
  }

  const { data, error } = await service.findById(id);
  if (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: error.message });
    return;
  }
  res.json(data);
};

export const countAbertos = async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'aberto';
  const { count, error } = await service.countByStatus(status);
  if (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    return;
  }
  res.json({ status, count: count ?? 0 });
};

export const cancelar = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (id == null) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID inválido' });
    return;
  }

  const { data, error } = await service.cancelar(id);
  if (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    return;
  }
  res.json(data);
};
