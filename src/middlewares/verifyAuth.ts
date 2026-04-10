import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { HTTP_STATUS } from '../utils/constants';

export const verifyAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Token não fornecido',
    });
    return;
  }

  const token = authHeader.substring(7);
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
