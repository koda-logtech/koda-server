import { Request, Response } from 'express';
import { HTTP_STATUS, PAGINATION } from '../../utils/constants';
import * as service from './entregas.service';

type EntregaCompletaJoin = {
  caminhao?: {
    placa: string;
    users?: { name: string } | null;
    carga?: {
      temperatura_atual: number | string;
      temperatura_maxima: number | string;
      temperatura_minima: number | string;
    } | null;
  } | null;
  clientes?: { nome: string; endereco: string | null } | null;
  [key: string]: unknown;
};

const mapEntregaCompleta = (row: EntregaCompletaJoin) => {
  const { caminhao: caminhaoRow, clientes: clienteRow, ...rest } = row;
  const motorista = caminhaoRow?.users;
  const cargaRow = caminhaoRow?.carga;
  return {
    ...rest,
    placa_caminhao: caminhaoRow?.placa ?? null,
    nome_cliente: clienteRow?.nome ?? null,
    endereco_cliente: clienteRow?.endereco ?? null,
    nome_motorista: motorista?.name ?? null,
    temperatura_atual: cargaRow?.temperatura_atual ?? null,
    temperatura_maxima: cargaRow?.temperatura_maxima ?? null,
    temperatura_minima: cargaRow?.temperatura_minima ?? null,
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
  const mapped = (data ?? []).map((row) => mapEntregaCompleta(row as EntregaCompletaJoin));
  res.json(mapped);
};

export const getByIdCompleto = async (req: Request, res: Response) => {
  const { data, error } = await service.findByIdCompleto(Number(req.params.id));
  if (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: error.message });
    return;
  }
  res.json(mapEntregaCompleta(data as EntregaCompletaJoin));
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
