# Implementação de JWT no Koda Server (Cookies HttpOnly)

Este documento descreve como a autenticação baseada em JSON Web Token (JWT) e Cookies está implementada no Koda Server.

## 1. Configuração e Middleware
- **Cookie-Parser**: O servidor utiliza `cookie-parser` para processar cookies vindos do cliente.
- **CORS**: Configurado com `credentials: true` para permitir o recebimento de cookies. A origem deve ser explícita (ex: `http://localhost:5173`) e não pode ser o curinga `*`.

## 2. Emissão de Tokens (`src/modules/users/users.controller.ts`)

No login e registro bem-sucedidos, o servidor emite dois tokens via cabeçalho `Set-Cookie`:

- **access_token**:
  - Duração: 15 minutos.
  - Flags: `HttpOnly`, `SameSite=Lax`, `Secure` (em produção).
- **refresh_token**:
  - Duração: 7 dias.
  - Flags: `HttpOnly`, `SameSite=Lax`, `Secure` (em produção).

```typescript
// Exemplo de configuração no controlador
res.cookie('access_token', data.accessToken, { 
  httpOnly: true, 
  secure: process.env.NODE_ENV === 'production', 
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000 
});
```

## 3. Validação de Acesso (`src/middlewares/verifyAuth.ts`)

O middleware `verifyAuth` verifica a identidade do usuário seguindo esta ordem de prioridade:
1. **Cookies**: Verifica se existe o cookie `access_token`.
2. **Authorization Header**: Fallback para o header `Authorization: Bearer <token>` (útil para testes via CLI ou integrações legadas).

Se um token válido for encontrado, ele anexa os dados decodificados ao objeto `req.user`.

## 4. Fluxo de Refresh (`POST /users/refresh`)

A rota de renovação de token agora:
1. Lê o `refresh_token` do cookie.
2. Verifica a validade.
3. Se válido, emite um **novo** `access_token` via cookie.
4. Responde com `status: 200`.

## 5. Fluxo de Logout (`POST /users/logout`)

O logout limpa os cookies no navegador do usuário utilizando `res.clearCookie('access_token')` e `res.clearCookie('refresh_token')`.

## 6. Testes via CLI (CURL)

Para testar as rotas protegidas que usam cookies via CLI, você deve capturar e reenviar os cookies:

```bash
# Login (salvando cookies)
curl -X POST http://localhost:3000/users/login -c cookies.txt -d '{"email":"...","password":"..."}'

# Acessar perfil (enviando cookies)
curl -X GET http://localhost:3000/users/profile -b cookies.txt
```
