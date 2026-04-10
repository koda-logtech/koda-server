import supabase from '../../config/supabase';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signToken, signRefreshToken } from '../../utils/jwt';

const TABLE = 'users';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthUser {
  id: number;
  email: string;
  role: string;
  name: string;
  is_active: boolean;
}

interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export const findAll = (page: number, limit: number) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return supabase.from(TABLE).select('*').range(from, to);
};

export const findById = (id: number) =>
  supabase.from(TABLE).select('*').eq('id', id).single();

export const create = (data: Record<string, unknown>) =>
  supabase.from(TABLE).insert(data).select().single();

export const update = (id: number, data: Record<string, unknown>) =>
  supabase.from(TABLE).update(data).eq('id', id).select().single();

export const remove = (id: number) =>
  supabase.from(TABLE).delete().eq('id', id);

// Authentication functions

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  phone?: string
) => {
  try {
    const hashedPassword = await hashPassword(password);

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        name,
        email,
        password: hashedPassword,
        phone,
        role: 'user',
        is_active: true,
      })
      .select('id, name, email, phone, avatar_url, role, is_active, created_at, updated_at')
      .single();

    if (error) {
      return { error };
    }

    return { data };
  } catch (err) {
    return { error: err };
  }
};

export const loginUser = async (
  email: string,
  password: string
): Promise<{ data?: LoginResponse; error?: unknown }> => {
  try {
    const { data: user, error: findError } = await supabase
      .from(TABLE)
      .select('id, email, password, role, name, is_active')
      .eq('email', email)
      .single();

    if (findError || !user) {
      return { error: { message: 'Usuário não encontrado' } };
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return { error: { message: 'Senha incorreta' } };
    }

    if (!user.is_active) {
      return { error: { message: 'Usuário inativo' } };
    }

    const accessToken = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = signRefreshToken(user.id);

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      is_active: user.is_active,
    };

    return { data: { user: authUser, accessToken, refreshToken } };
  } catch (err) {
    return { error: err };
  }
};

export const validateUserByEmail = async (
  email: string
): Promise<{ data?: User | null; error?: unknown }> => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, name, email, phone, avatar_url, role, is_active, created_at, updated_at')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null };
      }
      return { error };
    }

    return { data };
  } catch (err) {
    return { error: err };
  }
};

export const updatePassword = async (
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<{ success?: boolean; error?: unknown }> => {
  try {
    const { data: user, error: findError } = await supabase
      .from(TABLE)
      .select('password')
      .eq('id', userId)
      .single();

    if (findError || !user) {
      return { error: { message: 'Usuário não encontrado' } };
    }

    const isPasswordValid = await verifyPassword(oldPassword, user.password);

    if (!isPasswordValid) {
      return { error: { message: 'Senha atual incorreta' } };
    }

    const hashedNewPassword = await hashPassword(newPassword);

    const { error: updateError } = await supabase
      .from(TABLE)
      .update({ password: hashedNewPassword })
      .eq('id', userId);

    if (updateError) {
      return { error: updateError };
    }

    return { success: true };
  } catch (err) {
    return { error: err };
  }
};

export const findUserForAuth = async (
  userId: number
): Promise<{ data?: AuthUser | null; error?: unknown }> => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, email, role, name, is_active')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null };
      }
      return { error };
    }

    return { data };
  } catch (err) {
    return { error: err };
  }
};
