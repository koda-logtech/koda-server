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
): string => jwt.sign(
    payload as object,
    env.jwt.secret as string,
    {
      expiresIn: expiresIn || env.jwt.expiresIn,
      algorithm: 'HS256',
    } as any,
);

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

export const signRefreshToken = (userId: number): string => jwt.sign(
    { id: userId } as object,
    env.jwt.secret as string,
    {
      expiresIn: env.jwt.refreshExpiresIn as string,
      algorithm: 'HS256',
    } as any,
);

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

export interface ActivationTokenPayload {
  id: number;
  email: string;
  type: 'activation';
}

export const signActivationToken = (
  payload: { id: number; email: string },
  expiresIn = '48h',
): string => jwt.sign(
  { id: payload.id, email: payload.email, type: 'activation' },
  env.jwt.secret as string,
  {
    expiresIn,
    algorithm: 'HS256',
  } as any,
);

export const verifyActivationToken = (token: string): ActivationTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, env.jwt.secret as string) as ActivationTokenPayload;
    if (decoded.type !== 'activation') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};
