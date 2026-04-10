import { Request, Response, NextFunction } from 'express';
import { verifyToken as verifyTokenUtil } from '../utils/jwt';
import { HTTP_STATUS, ERROR_MESSAGES } from '../utils/constants';

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
    email: string;
    role: string;
  };
};

/**
 * Extract JWT token from Authorization header
 * Expected format: Bearer <token>
 */
const extractToken = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
};

/**
 * Middleware to verify JWT token and attach user to request
 * Expects Authorization header with Bearer token
 */
export const verifyToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = extractToken(req.headers.authorization);

  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: ERROR_MESSAGES.UNAUTHORIZED,
      message: 'Missing or invalid Authorization header',
    });
  }

  const user = verifyTokenUtil(token);

  if (!user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: ERROR_MESSAGES.UNAUTHORIZED,
      message: 'Invalid or expired token',
    });
  }

  req.user = user;
  next();
};

/**
 * Factory function to create role-based access control middleware
 * Takes a single role or array of roles as parameter
 */
export const requireRole = (allowedRoles: string | string[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: ERROR_MESSAGES.UNAUTHORIZED,
        message: 'Missing or invalid Authorization header',
      });
    }

    const user = verifyTokenUtil(token);

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: ERROR_MESSAGES.UNAUTHORIZED,
        message: 'Invalid or expired token',
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: ERROR_MESSAGES.FORBIDDEN,
        message: `User role '${user.role}' is not allowed to access this resource`,
      });
    }

    req.user = user;
    next();
  };
};

export default verifyToken;
