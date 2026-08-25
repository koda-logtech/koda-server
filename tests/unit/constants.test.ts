import { describe, it, expect } from 'vitest';
import { HTTP_STATUS, ERROR_MESSAGES, PAGINATION, ENVIRONMENTS } from '../../src/utils/constants.js';

describe('Constants', () => {
  it('should have standard HTTP status codes', () => {
    expect(HTTP_STATUS.OK).toBe(200);
    expect(HTTP_STATUS.CREATED).toBe(201);
    expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
    expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    expect(HTTP_STATUS.FORBIDDEN).toBe(403);
    expect(HTTP_STATUS.NOT_FOUND).toBe(404);
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
  });

  it('should define default pagination parameters', () => {
    expect(PAGINATION.DEFAULT_PAGE).toBe(1);
    expect(PAGINATION.DEFAULT_LIMIT).toBe(10);
    expect(PAGINATION.MAX_LIMIT).toBe(100);
  });

  it('should define common error messages', () => {
    expect(ERROR_MESSAGES.NOT_FOUND).toBe('Recurso não encontrado');
    expect(ERROR_MESSAGES.UNAUTHORIZED).toBe('Não autorizado');
  });

  it('should define environments', () => {
    expect(ENVIRONMENTS.DEVELOPMENT).toBe('development');
    expect(ENVIRONMENTS.PRODUCTION).toBe('production');
    expect(ENVIRONMENTS.TEST).toBe('test');
  });
});
