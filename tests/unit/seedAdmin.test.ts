import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_API_KEY = 'test-api-key';
});

import * as usersService from '../../src/modules/users/users.service';
import supabase from '../../src/config/supabase';
import * as passwordUtils from '../../src/utils/password';
import { Role } from '../../src/utils/constants';

vi.mock('../../src/config/supabase', () => ({
  default: {
    from: vi.fn(),
  },
}));

vi.mock('../../src/utils/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password_123'),
  verifyPassword: vi.fn(),
}));

describe('seedAdminUser', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should skip seeding if ADMIN_EMAIL or ADMIN_PASSWORD is missing', async () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;

    await usersService.seedAdminUser();

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('should create admin user if it does not exist', async () => {
    process.env.ADMIN_EMAIL = 'admin@koda.com';
    process.env.ADMIN_PASSWORD = 'supersecretpassword';
    process.env.ADMIN_NAME = 'Admin Master';

    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: mockSelect,
          insert: mockInsert,
        };
      }
      return {};
    });

    await usersService.seedAdminUser();

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(mockSelect).toHaveBeenCalledWith('id, email, password, role');
    expect(mockEq).toHaveBeenCalledWith('email', 'admin@koda.com');
    expect(passwordUtils.hashPassword).toHaveBeenCalledWith('supersecretpassword');
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Admin Master',
      email: 'admin@koda.com',
      password: 'hashed_password_123',
      role: Role.ADMIN,
      is_active: true,
    });
  });

  it('should update user to admin if user exists but has different role or password', async () => {
    process.env.ADMIN_EMAIL = 'admin@koda.com';
    process.env.ADMIN_PASSWORD = 'newpassword';

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 1,
        email: 'admin@koda.com',
        password: 'old_hashed_password',
        role: Role.USER,
      },
      error: null,
    });
    const mockEqSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqSelect });

    const mockEqUpdate = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {};
    });

    (passwordUtils.verifyPassword as any).mockResolvedValue(false);

    await usersService.seedAdminUser();

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        role: Role.ADMIN,
        password: 'hashed_password_123',
        is_active: true,
      }),
    );
    expect(mockEqUpdate).toHaveBeenCalledWith('id', 1);
  });

  it('should not update if user already exists with ADMIN role and matching password', async () => {
    process.env.ADMIN_EMAIL = 'admin@koda.com';
    process.env.ADMIN_PASSWORD = 'matchingpassword';

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 1,
        email: 'admin@koda.com',
        password: 'hashed_matching',
        role: Role.ADMIN,
      },
      error: null,
    });
    const mockEqSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqSelect });
    const mockUpdate = vi.fn();

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {};
    });

    (passwordUtils.verifyPassword as any).mockResolvedValue(true);

    await usersService.seedAdminUser();

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
