import crypto from 'crypto';
import supabase from '../../config/supabase';
import { hashPassword } from '../../utils/password';
import { signActivationToken } from '../../utils/jwt';
import { Role, AccessRequestStatus } from '../../utils/constants';
import { sendActivationEmail, sendRejectionEmail } from '../../services/email.service';

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
  rejection_reason?: string;
  rejectionReason?: string;
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
    rejectionReason: row.rejection_reason || row.rejectionReason,
    rejection_reason: row.rejection_reason,
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

  // 2. Verificar se já existe solicitação pendente para o e-mail
  const { data: pendingRequest } = await supabase
    .from(TABLE)
    .select('id, email, status')
    .eq('email', email)
    .eq('status', AccessRequestStatus.PENDING)
    .maybeSingle();

  // Prevenção contra Enumeração de Usuários (OWASP User Enumeration / Account Harvesting):
  // Se já existir usuário cadastrado ou solicitação pendente, não cria duplicata nem envia e-mail,
  // retornando sucesso neutro e indistinguível para manter a superfície de ataque mínima.
  if (existingUser || pendingRequest) {
    return {
      data: {
        id: 'ack',
        nome: data.nome.trim(),
        email,
        empresa: data.empresa.trim(),
        cargo: data.cargo.trim(),
        descricao: data.descricao.trim(),
        status: AccessRequestStatus.PENDING,
        createdAt: new Date().toISOString(),
      },
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
    return { notFound: true, error: { message: 'Request not found' } };
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

  // 5. Enviar e-mail de ativação em background para resposta imediata
  sendActivationEmail({
    to: userEmail,
    name: userName,
    activationLink,
  }).catch((err) => {
    console.error('Failed to send activation email in background:', err);
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
      message: 'Request successfully approved',
    },
  };
};

export const reject = async (id: string, reason?: string, notify = true) => {
  const { data: request, error: findError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (findError || !request) {
    return { notFound: true, error: { message: 'Request not found' } };
  }

  if (request.status !== AccessRequestStatus.PENDING) {
    return {
      conflict: true,
      error: { message: `Solicitação já foi ${request.status}` },
    };
  }

  const updatePayload: Record<string, any> = {
    status: AccessRequestStatus.REJECTED,
    updated_at: new Date().toISOString(),
  };

  if (reason && reason.trim()) {
    updatePayload.rejection_reason = reason.trim();
  }

  let { data: updatedRequest, error: updateError } = await supabase
    .from(TABLE)
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  // Caso a coluna rejection_reason ainda não tenha sido criada no Supabase, tenta atualizar sem ela
  if (updateError && 'rejection_reason' in updatePayload) {
    // eslint-disable-next-line no-console
    console.warn('[AccessRequests] Failed to persist rejection_reason in the database. Applying fallback without the field:', updateError.message || updateError);
    delete updatePayload.rejection_reason;
    const retry = await supabase
      .from(TABLE)
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();
    updatedRequest = retry.data;
    updateError = retry.error;
  }

  if (updateError) {
    return { error: updateError };
  }

  // Enviar e-mail de notificação de rejeição em background se notify for true
  if (notify && request.email) {
    sendRejectionEmail({
      to: request.email,
      name: request.nome,
      reason: reason?.trim(),
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[Email] Failed to send rejection email in background:', err);
    });
  }

  return {
    data: formatAccessRequest({
      ...(updatedRequest || request),
      status: AccessRequestStatus.REJECTED,
      rejection_reason: reason?.trim(),
    }),
  };
};
