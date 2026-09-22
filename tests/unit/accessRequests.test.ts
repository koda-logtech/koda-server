import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-key-12345';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_API_KEY = 'test-api-key';
});

import * as accessRequestsService from '../../src/modules/access_requests/access_requests.service';
import * as usersService from '../../src/modules/users/users.service';
import supabase from '../../src/config/supabase';
import { AccessRequestStatus, Role } from '../../src/utils/constants';
import * as passwordUtils from '../../src/utils/password';
import * as jwtUtils from '../../src/utils/jwt';

vi.mock('../../src/config/supabase', () => ({
  default: {
    from: vi.fn(),
  },
}));

vi.mock('../../src/utils/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_test_password'),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

describe('Access Requests Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should return conflict if user already exists in users table', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 1, email: 'existente@koda.com' },
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: mockSelect };
        }
        return {};
      });

      const result = await accessRequestsService.create({
        nome: 'João Silva',
        email: 'existente@koda.com',
        empresa: 'LogTech',
        cargo: 'Gerente',
        descricao: 'Preciso de acesso',
      });

      expect(result.conflict).toBe(true);
      expect(result.error?.message).toContain('já possui cadastro');
    });

    it('should return conflict if a pending access request already exists for this email', async () => {
      const mockUsersMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockUsersEq = vi.fn().mockReturnValue({ maybeSingle: mockUsersMaybeSingle });
      const mockUsersSelect = vi.fn().mockReturnValue({ eq: mockUsersEq });

      const mockReqMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'req-1', email: 'pendente@koda.com', status: AccessRequestStatus.PENDING },
        error: null,
      });
      const mockReqEqStatus = vi.fn().mockReturnValue({ maybeSingle: mockReqMaybeSingle });
      const mockReqEqEmail = vi.fn().mockReturnValue({ eq: mockReqEqStatus });
      const mockReqSelect = vi.fn().mockReturnValue({ eq: mockReqEqEmail });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'users') return { select: mockUsersSelect };
        if (table === 'access_requests') return { select: mockReqSelect };
        return {};
      });

      const result = await accessRequestsService.create({
        nome: 'João Silva',
        email: 'pendente@koda.com',
        empresa: 'LogTech',
        cargo: 'Gerente',
        descricao: 'Preciso de acesso',
      });

      expect(result.conflict).toBe(true);
      expect(result.error?.message).toContain('Já existe uma solicitação de acesso pendente');
    });

    it('should create new access request successfully', async () => {
      const mockUsersMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockUsersEq = vi.fn().mockReturnValue({ maybeSingle: mockUsersMaybeSingle });
      const mockUsersSelect = vi.fn().mockReturnValue({ eq: mockUsersEq });

      const mockReqMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockReqEqStatus = vi.fn().mockReturnValue({ maybeSingle: mockReqMaybeSingle });
      const mockReqEqEmail = vi.fn().mockReturnValue({ eq: mockReqEqStatus });
      const mockReqSelect = vi.fn().mockReturnValue({ eq: mockReqEqEmail });

      const mockInserted = {
        id: 'uuid-1234',
        nome: 'Novo Usuário',
        email: 'novo@koda.com',
        empresa: 'LogTech',
        cargo: 'Analista',
        descricao: 'Acesso para relatórios',
        status: AccessRequestStatus.PENDING,
        created_at: '2026-09-21T20:00:00.000Z',
        updated_at: '2026-09-21T20:00:00.000Z',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockInserted, error: null });
      const mockSelectAfterInsert = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelectAfterInsert });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'users') return { select: mockUsersSelect };
        if (table === 'access_requests') {
          return {
            select: mockReqSelect,
            insert: mockInsert,
          };
        }
        return {};
      });

      const result = await accessRequestsService.create({
        nome: 'Novo Usuário',
        email: 'novo@koda.com',
        empresa: 'LogTech',
        cargo: 'Analista',
        descricao: 'Acesso para relatórios',
      });

      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('uuid-1234');
      expect(result.data?.status).toBe(AccessRequestStatus.PENDING);
      expect(result.data?.createdAt).toBe('2026-09-21T20:00:00.000Z');
    });
  });

  describe('approve', () => {
    it('should approve pending request, create user and return activation link', async () => {
      const mockRequest = {
        id: 'req-uuid',
        nome: 'Carlos Souza',
        email: 'carlos@empresa.com',
        status: AccessRequestStatus.PENDING,
        created_at: '2026-09-21T20:00:00.000Z',
      };

      // 1. find request
      const mockReqSingle = vi.fn().mockResolvedValue({ data: mockRequest, error: null });
      const mockReqEq = vi.fn().mockReturnValue({ single: mockReqSingle });

      // 2. check user existing
      const mockUserMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockUserEq = vi.fn().mockReturnValue({ maybeSingle: mockUserMaybeSingle });

      // 3. create user
      const mockCreatedUser = {
        id: 42,
        email: 'carlos@empresa.com',
        name: 'Carlos Souza',
        role: Role.USER,
      };
      const mockUserSingle = vi.fn().mockResolvedValue({ data: mockCreatedUser, error: null });
      const mockUserSelectAfterInsert = vi.fn().mockReturnValue({ single: mockUserSingle });
      const mockUserInsert = vi.fn().mockReturnValue({ select: mockUserSelectAfterInsert });

      // 4. update request
      const mockUpdatedReq = {
        ...mockRequest,
        status: AccessRequestStatus.APPROVED,
      };
      const mockReqSingleAfterUpdate = vi.fn().mockResolvedValue({ data: mockUpdatedReq, error: null });
      const mockReqSelectAfterUpdate = vi.fn().mockReturnValue({ single: mockReqSingleAfterUpdate });
      const mockReqEqUpdate = vi.fn().mockReturnValue({ select: mockReqSelectAfterUpdate });
      const mockReqUpdate = vi.fn().mockReturnValue({ eq: mockReqEqUpdate });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'access_requests') {
          return {
            select: vi.fn().mockReturnValue({ eq: mockReqEq }),
            update: mockReqUpdate,
          };
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({ eq: mockUserEq }),
            insert: mockUserInsert,
          };
        }
        return {};
      });

      const result = await accessRequestsService.approve('req-uuid', 'http://localhost:5173');

      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(42);
      expect(result.data?.email).toBe('carlos@empresa.com');
      expect(result.data?.role).toBe(Role.USER);
      expect(result.data?.activationToken).toBeDefined();
      expect(result.data?.activationLink).toContain('http://localhost:5173/ativar-conta?token=');
      expect(result.data?.request?.status).toBe(AccessRequestStatus.APPROVED);
    });

    it('should return conflict if request is not in status pendente', async () => {
      const mockRequest = {
        id: 'req-uuid',
        nome: 'Carlos Souza',
        email: 'carlos@empresa.com',
        status: AccessRequestStatus.APPROVED,
      };

      const mockReqSingle = vi.fn().mockResolvedValue({ data: mockRequest, error: null });
      const mockReqEq = vi.fn().mockReturnValue({ single: mockReqSingle });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'access_requests') {
          return { select: vi.fn().mockReturnValue({ eq: mockReqEq }) };
        }
        return {};
      });

      const result = await accessRequestsService.approve('req-uuid');

      expect(result.conflict).toBe(true);
      expect(result.error?.message).toContain('já foi approved');
    });
  });

  describe('reject', () => {
    it('should reject pending request', async () => {
      const mockRequest = {
        id: 'req-uuid',
        nome: 'Carlos Souza',
        email: 'carlos@empresa.com',
        status: AccessRequestStatus.PENDING,
        created_at: '2026-09-21T20:00:00.000Z',
      };

      const mockReqSingle = vi.fn().mockResolvedValue({ data: mockRequest, error: null });
      const mockReqEq = vi.fn().mockReturnValue({ single: mockReqSingle });

      const mockUpdatedReq = { ...mockRequest, status: AccessRequestStatus.REJECTED };
      const mockReqSingleAfterUpdate = vi.fn().mockResolvedValue({ data: mockUpdatedReq, error: null });
      const mockReqSelectAfterUpdate = vi.fn().mockReturnValue({ single: mockReqSingleAfterUpdate });
      const mockReqEqUpdate = vi.fn().mockReturnValue({ select: mockReqSelectAfterUpdate });
      const mockReqUpdate = vi.fn().mockReturnValue({ eq: mockReqEqUpdate });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'access_requests') {
          return {
            select: vi.fn().mockReturnValue({ eq: mockReqEq }),
            update: mockReqUpdate,
          };
        }
        return {};
      });

      const result = await accessRequestsService.reject('req-uuid');

      expect(result.data).toBeDefined();
      expect(result.data?.status).toBe(AccessRequestStatus.REJECTED);
    });
  });

  describe('activateUser', () => {
    it('should fail with invalid activation token', async () => {
      const result = await usersService.activateUser('invalid-token', 'novasenha123');
      expect(result.error?.message).toContain('inválido ou expirado');
    });

    it('should successfully activate user and update password with valid token', async () => {
      const token = jwtUtils.signActivationToken({ id: 99, email: 'ativar@koda.com' });

      const mockUser = { id: 99, email: 'ativar@koda.com', is_active: false };
      const mockUserSingle = vi.fn().mockResolvedValue({ data: mockUser, error: null });
      const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle });
      const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq });

      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: mockUserSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      const result = await usersService.activateUser(token, 'minhanovasenha123');

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'hashed_test_password',
          is_active: true,
        }),
      );
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 99);
    });
  });
});
