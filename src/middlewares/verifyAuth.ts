import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { HTTP_STATUS } from '../utils/constants';

export const verifyAuth = (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Prioridade 1: Cookies (HttpOnly)
  if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  } 
  // Prioridade 2: Authorization Header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  if (!token) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Token não fornecido',
    });
    return;
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Token inválido ou expirado',
    });
    return;
  }

  req.user = {
    id: decoded.id || 0,
    email: decoded.email,
    role: decoded.role || 'user',
  };

  next();
};
