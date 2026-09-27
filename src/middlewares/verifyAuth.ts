import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { HTTP_STATUS, Role } from '../utils/constants';

export const verifyAuth = (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Prioridade 1: Cookies (HttpOnly)
  if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  if (!token) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Token not provided',
    });
    return;
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Invalid or expired token',
    });
    return;
  }

  req.user = {
    id: decoded.id || 0,
    email: decoded.email,
    role: decoded.role || Role.USER,
  };

  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== Role.ADMIN) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      error: 'Access denied',
      message: 'Only administrators can access this resource',
    });
    return;
  }

  next();
};
