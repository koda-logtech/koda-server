import { Request, Response } from 'express';
import { HTTP_STATUS, PAGINATION } from '../../utils/constants';
import * as service from './caminhao.service';

type CaminhaoCompletoJoin = {
  users?: { name: string } | null;
  carga?: { tipo: string } | null;
  centro_logistica?: { nome: string } | null;
  [key: string]: unknown;
};

const mapCaminhaoCompleto = (row: CaminhaoCompletoJoin) => {
  const {
    users,
    carga,
    centro_logistica: centroLogistica,
    ...rest
  } = row;
  return {
    ...rest,
    nome_motorista: users?.name ?? null,
    tipo_carga: carga?.tipo ?? null,
    nome_centro_logistica: centroLogistica?.nome ?? null,
  };
};

export const getAllCompleto = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

  const { data, error } = await service.findAllCompleto(page, limit);
  if (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    return;
  }
  const mapped = (data ?? []).map((row) => mapCaminhaoCompleto(row as CaminhaoCompletoJoin));
  res.json(mapped);
};

export const getByIdCompleto = async (req: Request, res: Response) => {
  const { data, error } = await service.findByIdCompleto(Number(req.params.id));
  if (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: error.message });
    return;
  }
  res.json(mapCaminhaoCompleto(data as CaminhaoCompletoJoin));
};

export const getAll = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

  const { data, error } = await service.findAll(page, limit);
  if (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    return;
  }
  res.json(data);
};

export const getById = async (req: Request, res: Response) => {
  const { data, error } = await service.findById(Number(req.params.id));
  if (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: error.message });
    return;
  }
  res.json(data);
};

export const create = async (req: Request, res: Response) => {
  const { data, error } = await service.create(req.body);
  if (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    return;
  }
  res.status(HTTP_STATUS.CREATED).json(data);
};

export const update = async (req: Request, res: Response) => {
  const { data, error } = await service.update(Number(req.params.id), req.body);
  if (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    return;
  }
  res.json(data);
};

export const remove = async (req: Request, res: Response) => {
  const { error } = await service.remove(Number(req.params.id));
  if (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
    return;
  }
  res.status(HTTP_STATUS.OK).json({ message: 'Removido com sucesso' });
};
