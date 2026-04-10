import jwt from 'jsonwebtoken';
import { getEnvironment } from '../config/environment';

const env = getEnvironment();

export interface TokenPayload {
  id: number;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  id: number;
}

export const signToken = (
  payload: TokenPayload,
  expiresIn?: string,
): string => {
  return jwt.sign(
    payload as object,
    env.jwt.secret as string,
    {
      expiresIn: expiresIn || env.jwt.expiresIn,
      algorithm: 'HS256',
    } as any
  );
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, env.jwt.secret as string) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
};

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.decode(token) as TokenPayload | null;
    return decoded;
  } catch {
    return null;
  }
};

export const signRefreshToken = (userId: number): string => {
  return jwt.sign(
    { id: userId } as object,
    env.jwt.secret as string,
    {
      expiresIn: env.jwt.refreshExpiresIn as string,
      algorithm: 'HS256',
    } as any
  );
};

export const verifyRefreshToken = (
  token: string,
): RefreshTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, env.jwt.secret as string) as RefreshTokenPayload;
    return decoded;
  } catch {
    return null;
  }
};
