import crypto from 'crypto';
import supabase from '../../config/supabase';
import { hashPassword } from '../../utils/password';
import { signActivationToken } from '../../utils/jwt';
import { Role, AccessRequestStatus } from '../../utils/constants';
import { sendActivationEmail } from '../../services/email.service';

const TABLE = 'access_requests';
const USERS_TABLE = 'users';

export interface CreateAccessRequestDTO {
  nome: string;
  email: string;
  empresa: string;
  cargo: string;
  descricao: string;
}

export interface AccessRequestModel {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  cargo: string;
  descricao: string;
  status: AccessRequestStatus;
  created_at: string;
  updated_at: string;
  createdAt?: string;
}

export const formatAccessRequest = (row: any) => {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    empresa: row.empresa,
    cargo: row.cargo,
    descricao: row.descricao,
    status: row.status,
    createdAt: row.created_at || row.createdAt,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export const create = async (data: CreateAccessRequestDTO) => {
  const email = data.email.trim().toLowerCase();

  // 1. Verificar se usuário já existe no sistema
  const { data: existingUser } = await supabase
    .from(USERS_TABLE)
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    return {
      conflict: true,
      error: { message: 'Este e-mail já possui cadastro na plataforma' },
    };
  }

  // 2. Verificar se já existe solicitação pendente para o e-mail
  const { data: pendingRequest } = await supabase
    .from(TABLE)
    .select('id, email, status')
    .eq('email', email)
    .eq('status', AccessRequestStatus.PENDING)
    .maybeSingle();

  if (pendingRequest) {
    return {
      conflict: true,
      error: { message: 'Já existe uma solicitação de acesso pendente para este e-mail' },
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from(TABLE)
    .insert({
      nome: data.nome.trim(),
      email,
      empresa: data.empresa.trim(),
      cargo: data.cargo.trim(),
      descricao: data.descricao.trim(),
      status: AccessRequestStatus.PENDING,
    })
    .select('*')
    .single();

  if (insertError) {
    return { error: insertError };
  }

  return { data: formatAccessRequest(inserted) };
};

export const findAll = async (page: number, limit: number, status?: string) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.range(from, to);

  if (error) {
    return { error };
  }

  return { data: (data || []).map(formatAccessRequest) };
};

export const findById = async (id: string) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { error };
  }

  return { data: formatAccessRequest(data) };
};

export const approve = async (id: string, origin?: string) => {
  // 1. Localizar solicitação
  const { data: request, error: findError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (findError || !request) {
    return { notFound: true, error: { message: 'Solicitação não encontrada' } };
  }

  if (request.status !== AccessRequestStatus.PENDING) {
    return {
      conflict: true,
      error: { message: `Solicitação já foi ${request.status}` },
    };
  }

  // 2. Verificar ou criar usuário na tabela users
  let userId: number;
  let userEmail = request.email;
  let userRole = Role.USER;
  let userName = request.nome;

  const { data: existingUser } = await supabase
    .from(USERS_TABLE)
    .select('id, email, role, name')
    .eq('email', request.email)
    .maybeSingle();

  if (existingUser) {
    userId = existingUser.id;
    userEmail = existingUser.email;
    userRole = existingUser.role;
    userName = existingUser.name;
  } else {
    // Gerar senha temporária aleatória segura que será substituída na ativação
    const randomPassword = crypto.randomBytes(24).toString('hex');
    const hashedPassword = await hashPassword(randomPassword);

    const { data: createdUser, error: createUserError } = await supabase
      .from(USERS_TABLE)
      .insert({
        name: request.nome,
        email: request.email,
        password: hashedPassword,
        role: Role.USER,
        is_active: false,
      })
      .select('id, email, role, name')
      .single();

    if (createUserError || !createdUser) {
      return { error: createUserError || { message: 'Falha ao criar usuário' } };
    }

    userId = createdUser.id;
    userEmail = createdUser.email;
    userRole = createdUser.role;
    userName = createdUser.name;
  }

  // 3. Atualizar status da solicitação para aprovado
  const { data: updatedRequest, error: updateRequestError } = await supabase
    .from(TABLE)
    .update({
      status: AccessRequestStatus.APPROVED,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateRequestError) {
    return { error: updateRequestError };
  }

  // 4. Gerar token e link de ativação
  const activationToken = signActivationToken({ id: userId, email: userEmail });
  const rawOrigin = origin || process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173';
  const baseUrl = rawOrigin.trim().replace(/\/$/, '');
  const activationLink = `${baseUrl}/ativar-conta?token=${activationToken}`;

  // 5. Enviar e-mail de ativação via Resend
  const emailResult = await sendActivationEmail({
    to: userEmail,
    name: userName,
    activationLink,
  });

  const userData = {
    id: userId,
    email: userEmail,
    role: userRole,
    name: userName,
  };

  return {
    data: {
      ...userData,
      user: userData,
      request: formatAccessRequest(updatedRequest),
      activationToken,
      activationLink,
      emailSent: emailResult.success,
      message: 'Solicitação aprovada com sucesso',
    },
  };
};

export const reject = async (id: string) => {
  const { data: request, error: findError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (findError || !request) {
    return { notFound: true, error: { message: 'Solicitação não encontrada' } };
  }

  if (request.status !== AccessRequestStatus.PENDING) {
    return {
      conflict: true,
      error: { message: `Solicitação já foi ${request.status}` },
    };
  }

  const { data: updatedRequest, error: updateError } = await supabase
    .from(TABLE)
    .update({
      status: AccessRequestStatus.REJECTED,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) {
    return { error: updateError };
  }

  return { data: formatAccessRequest(updatedRequest) };
};
