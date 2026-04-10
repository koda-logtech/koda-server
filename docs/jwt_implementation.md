# Implementação de JWT no Koda Server

Este documento descreve como a autenticação baseada em JSON Web Token (JWT) está implementada no projeto.

## 1. Configuração

As configurações de JWT são gerenciadas centralmente em `src/config/environment.ts`.

- **JWT_SECRET**: Chave secreta usada para assinar e verificar tokens (Obrigatória).
- **JWT_EXPIRY**: Tempo de expiração do token de acesso (Padrão: `15m`).
- **JWT_REFRESH_EXPIRY**: Tempo de expiração do token de atualização (Padrão: `7d`).

## 2. Utilitários (`src/utils/jwt.ts`)

O arquivo de utilitários fornece funções para manipulação de tokens usando a biblioteca `jsonwebtoken`.

### Funções Principais:
- `signToken(payload: TokenPayload, expiresIn?: string)`: Gera um Access Token com ID do usuário, email e cargo.
- `verifyToken(token: string)`: Verifica a validade de um Access Token e retorna o payload decodificado.
- `signRefreshToken(userId: number)`: Gera um Refresh Token contendo apenas o ID do usuário.
- `verifyRefreshToken(token: string)`: Verifica a validade de um Refresh Token.

### Payload do Token:
```typescript
interface TokenPayload {
  id: number;
  email: string;
  role: string;
}
```

## 3. Middlewares

Existem dois middlewares principais para proteção de rotas:

### `src/middlewares/verifyAuth.ts`
Este é o middleware padrão usado para proteger rotas de usuário.
- **Funcionamento**: Extrai o token do cabeçalho `Authorization: Bearer <token>`, verifica sua validade e anexa as informações do usuário ao objeto `req.user`.

### `src/middlewares/auth.ts`
Oferece funcionalidades adicionais para Controle de Acesso Baseado em Cargos (RBAC).
- `verifyToken`: Semelhante ao `verifyAuth`, mas com tratamento de erro usando constantes globais.
- `requireRole(allowedRoles: string | string[])`: Factory que cria um middleware para permitir acesso apenas a cargos específicos (ex: 'admin').

## 4. Uso em Rotas (`src/modules/users/users.routes.ts`)

As rotas são protegidas aplicando o middleware antes do controller.

```typescript
import { verifyAuth } from '../../middlewares/verifyAuth';

router.get('/profile', verifyAuth, controller.profile);
router.post('/refresh', verifyAuth, controller.refreshToken);
```

## 5. Fluxo de Autenticação

1. **Login**: O usuário fornece credenciais e recebe um `accessToken` e um `refreshToken`.
2. **Acesso**: O `accessToken` deve ser enviado em cada requisição protegida no header `Authorization`.
3. **Expiração**: Quando o `accessToken` expira (15 min), o cliente deve usar o `refreshToken` na rota `/refresh` para obter um novo `accessToken`.
