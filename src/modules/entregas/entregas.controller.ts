import { Request, Response } from 'express';
import { HTTP_STATUS, PAGINATION } from '../../utils/constants';
import * as cargaService from '../carga/carga.service';
import * as service from './entregas.service';
import {
  coordsAvailable,
  fetchDrivingDirections,
} from '../../services/mapboxDirections.service';

type EntregaCompletaJoin = {
  caminhao?: {
    id_carga?: number | null;
    placa: string;
    modelo?: string | null;
    users?: { name: string; avatar_url?: string | null } | null;
    carga?: {
      id?: number;
      temperatura_atual: number | string;
      temperatura_maxima: number | string;
      temperatura_minima: number | string;
      latitude?: number | string | null;
      longitude?: number | string | null;
    } | null;
  } | null;
  clientes?: {
    nome: string;
    endereco: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
  } | null;
  [key: string]: unknown;
};

const resolveIdCarga = (row: EntregaCompletaJoin): number | null => {
  const fromCaminhao = row.caminhao?.id_carga;
  if (typeof fromCaminhao === 'number' && fromCaminhao > 0) return fromCaminhao;
  const fromCarga = row.caminhao?.carga?.id;
  if (typeof fromCarga === 'number' && fromCarga > 0) return fromCarga;
  return null;
};

const mapEntregaCompleta = (row: EntregaCompletaJoin) => {
  const { caminhao: caminhaoRow, clientes: clienteRow, ...rest } = row;
  const motorista = caminhaoRow?.users;
  const cargaRow = caminhaoRow?.carga;
  return {
    ...rest,
    placa_caminhao: caminhaoRow?.placa ?? null,
    modelo_caminhao: caminhaoRow?.modelo ?? null,
    nome_cliente: clienteRow?.nome ?? null,
    endereco_cliente: clienteRow?.endereco ?? null,
    nome_motorista: motorista?.name ?? null,
    motorista_avatar_url: motorista?.avatar_url ?? null,
    temperatura_atual: cargaRow?.temperatura_atual ?? null,
    temperatura_maxima: cargaRow?.temperatura_maxima ?? null,
    temperatura_minima: cargaRow?.temperatura_minima ?? null,
    latitude_carga: cargaRow?.latitude ?? null,
    longitude_carga: cargaRow?.longitude ?? null,
    latitude_cliente: clienteRow?.latitude ?? null,
    longitude_cliente: clienteRow?.longitude ?? null,
    id_carga: resolveIdCarga(row),
  };
};

type EntregaCompletaMapped = ReturnType<typeof mapEntregaCompleta>;

const attachUltimaAuditoria = async (
  rows: EntregaCompletaJoin[],
  mapped: EntregaCompletaMapped[],
): Promise<(EntregaCompletaMapped & { ultima_auditoria_at: string | null })[]> => {
  const cargaIds = rows.map((r) => resolveIdCarga(r)).filter((id): id is number => id !== null);
  const ultimas = await cargaService.findUltimaAuditoriaPorCargas(cargaIds);
  const ultimaMap = new Map(
    ultimas.map((u) => [u.id_carga, u.ultima_auditoria_at] as const),
  );
  return rows.map((row, i) => {
    const cid = resolveIdCarga(row);
    const ua = cid !== null ? ultimaMap.get(cid) ?? null : null;
    return { ...mapped[i], ultima_auditoria_at: ua };
  });
};

export const getAllCompleto = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

  const { data, error } = await service.findAllCompleto(page, limit);
  if (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    return;
  }
  const rawRows = (data ?? []) as EntregaCompletaJoin[];
  const mapped = rawRows.map((row) => mapEntregaCompleta(row));
  const enriched = await attachUltimaAuditoria(rawRows, mapped);
  res.json(enriched);
};

export const getByIdCompleto = async (req: Request, res: Response) => {
  const { data, error } = await service.findByIdCompleto(Number(req.params.id));
  if (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: error.message });
    return;
  }
  const row = data as EntregaCompletaJoin;
  const base = mapEntregaCompleta(row);
  const [enriched] = await attachUltimaAuditoria([row], [base]);
  res.json(enriched);
};

export const getDirection = async (req: Request, res: Response) => {
  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  if (!token) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      error: 'Directions indisponível: MAPBOX_ACCESS_TOKEN não configurado.',
    });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'ID inválido' });
    return;
  }

  const { data, error } = await service.findByIdCompleto(id);
  if (error || !data) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: error?.message ?? 'Não encontrado' });
    return;
  }

  const mapped = mapEntregaCompleta(data as EntregaCompletaJoin);
  const latC = mapped.latitude_carga;
  const lngC = mapped.longitude_carga;
  const latCl = mapped.latitude_cliente;
  const lngCl = mapped.longitude_cliente;

  if (!coordsAvailable(latC, lngC, latCl, lngCl)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Coordenadas de origem ou destino ausentes ou inválidas para esta entrega.',
    });
    return;
  }

  const lo = Number(latC);
  const go = Number(lngC);
  const ld = Number(latCl);
  const gd = Number(lngCl);

  try {
    const result = await fetchDrivingDirections(token, go, lo, gd, ld);
    res.json({
      entrega_id: id,
      geometry: result.geometry,
      duration_seconds: result.durationSeconds,
      distance_meters: result.distanceMeters,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao obter rota';
    res.status(HTTP_STATUS.BAD_GATEWAY).json({ error: msg });
  }
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
