import { Request, Response } from 'express';
import Joi from 'joi';
import { HTTP_STATUS, PAGINATION } from '../../utils/constants';
import * as service from './users.service';
import { signToken, verifyRefreshToken } from '../../utils/jwt';

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

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

// Authentication controllers

export const register = async (req: Request, res: Response) => {
  const { error: validationError, value } = registerSchema.validate(req.body);

  if (validationError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Dados de entrada inválidos',
      details: validationError.message,
    });
    return;
  }

  const {
    name, email, password, phone,
  } = value;

  const existingUser = await service.validateUserByEmail(email);
  if (existingUser.data) {
    res.status(HTTP_STATUS.CONFLICT).json({
      error: 'Email já cadastrado',
    });
    return;
  }

  const { data, error } = await service.registerUser(name, email, password, phone);

  if (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: (error as any).message });
    return;
  }

  res.status(HTTP_STATUS.CREATED).json(data);
};

export const login = async (req: Request, res: Response) => {
  const { error: validationError, value } = loginSchema.validate(req.body);

  if (validationError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Dados de entrada inválidos',
      details: validationError.message,
    });
    return;
  }

  const { email, password } = value;

  const { data, error } = await service.loginUser(email, password);

  if (error) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: (error as any).message || 'Falha ao fazer login',
    });
    return;
  }

  // Configuração dos cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias para o refresh
  };

  if (data) {
    res.cookie('access_token', data.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', data.refreshToken, cookieOptions);
    res.status(HTTP_STATUS.OK).json({
      user: data.user,
      message: 'Login realizado com sucesso',
    });
  } else {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Erro ao gerar tokens' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const token = req.cookies.refresh_token;

  if (!token) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Token não fornecido',
    });
    return;
  }

  const decoded = verifyRefreshToken(token);

  if (!decoded) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Token inválido ou expirado',
    });
    return;
  }

  const { data: user, error } = await service.findUserForAuth(decoded.id);

  if (error || !user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Usuário não encontrado',
    });
    return;
  }

  const newToken = signToken({
    id: decoded.id,
    email: user.email,
    role: user.role,
  });

  res.cookie('access_token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 min
  });

  res.status(HTTP_STATUS.OK).json({ message: 'Token renovado' });
};

export const profile = async (req: Request, res: Response) => {
  const { user } = (req as any);

  if (!user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Usuário não autenticado',
    });
    return;
  }

  const { data: userProfile, error } = await service.findUserForAuth(user.id);

  if (error || !userProfile) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Perfil não encontrado',
    });
    return;
  }

  res.status(HTTP_STATUS.OK).json(userProfile);
};

export const changePassword = async (req: Request, res: Response) => {
  const { error: validationError, value } = changePasswordSchema.validate(req.body);

  if (validationError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Dados de entrada inválidos',
      details: validationError.message,
    });
    return;
  }

  const { user } = (req as any);

  if (!user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Usuário não autenticado',
    });
    return;
  }

  const { oldPassword, newPassword } = value;

  const { success, error } = await service.updatePassword(user.id, oldPassword, newPassword);

  if (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: (error as any).message || 'Falha ao alterar senha',
    });
    return;
  }

  if (!success) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Falha ao alterar senha',
    });
    return;
  }

  res.status(HTTP_STATUS.OK).json({
    message: 'Senha alterada com sucesso',
  });
};

export const logout = async (req: Request, res: Response) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', cookieOptions);

  res.status(HTTP_STATUS.OK).json({
    message: 'Desconectado com sucesso',
  });
};
