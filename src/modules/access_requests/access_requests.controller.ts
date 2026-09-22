import { Request, Response } from 'express';
import Joi from 'joi';
import { HTTP_STATUS, PAGINATION } from '../../utils/constants';
import * as service from './access_requests.service';

const createAccessRequestSchema = Joi.object({
  nome: Joi.string().trim().max(150).required(),
  email: Joi.string().email().trim().required(),
  empresa: Joi.string().trim().max(150).required(),
  cargo: Joi.string().trim().max(100).required(),
  descricao: Joi.string().trim().max(2000).required(),
});

export const create = async (req: Request, res: Response) => {
  const { error: validationError, value } = createAccessRequestSchema.validate(req.body);

  if (validationError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Dados de entrada inválidos',
      details: validationError.message,
    });
    return;
  }

  const result = await service.create(value);

  if (result.conflict) {
    res.status(HTTP_STATUS.CONFLICT).json({ error: result.error?.message });
    return;
  }

  if (result.error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: (result.error as any).message });
    return;
  }

  res.status(HTTP_STATUS.CREATED).json(result.data);
};

export const getAll = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(Number(req.query.limit) || PAGINATION.MAX_LIMIT, PAGINATION.MAX_LIMIT);
  const status = req.query.status as string | undefined;

  const { data, error } = await service.findAll(page, limit, status);

  if (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    return;
  }

  res.status(HTTP_STATUS.OK).json(data);
};

export const getById = async (req: Request, res: Response) => {
  const { data, error } = await service.findById(req.params.id);

  if (error || !data) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Solicitação não encontrada' });
    return;
  }

  res.status(HTTP_STATUS.OK).json(data);
};

export const approve = async (req: Request, res: Response) => {
  const origin = (req.headers.origin as string) || (req.headers.referer as string);
  const result = await service.approve(req.params.id, origin);

  if (result.notFound) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: result.error?.message });
    return;
  }

  if (result.conflict) {
    res.status(HTTP_STATUS.CONFLICT).json({ error: result.error?.message });
    return;
  }

  if (result.error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: (result.error as any).message });
    return;
  }

  res.status(HTTP_STATUS.OK).json(result.data);
};

export const reject = async (req: Request, res: Response) => {
  const result = await service.reject(req.params.id);

  if (result.notFound) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: result.error?.message });
    return;
  }

  if (result.conflict) {
    res.status(HTTP_STATUS.CONFLICT).json({ error: result.error?.message });
    return;
  }

  if (result.error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: (result.error as any).message });
    return;
  }

  res.status(HTTP_STATUS.OK).json(result.data);
};
