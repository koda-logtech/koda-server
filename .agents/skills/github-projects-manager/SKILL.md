---
name: github-projects-manager
description: Gerencia itens no GitHub Projects da koda-logtech. Use para listar repositórios, criar issues, vincular issues existentes a projetos e gerenciar o quadro de tarefas de forma interativa.
---

# Koda Project Manager

Esta skill gerencia a organização **koda-logtech** no GitHub. Ela permite uma gestão interativa de issues e projetos.

## Fluxo de Trabalho Interativo

Para garantir a melhor experiência, siga estas diretrizes:

1. **Identificação do Contexto**: Se o repositório ou o número do projeto não forem informados, use `listRepositories` ou `listProjects` para descobrir as opções e use `ask_user` para que o usuário escolha.
2. **Confirmação**: Antes de criar uma issue, confirme o título e o repositório com o usuário.
3. **Vinculação**: Você pode criar uma issue nova (`createAndLinkIssue`) ou vincular uma já existente (`linkExistingIssue`).

## Comandos Disponíveis

### Exploração
```bash
# Listar repositórios da organização
node scripts/github_api.cjs listRepositories

# Listar projetos (boards) da organização
node scripts/github_api.cjs listProjects

# Listar issues recentes de um repositório
node scripts/github_api.cjs listIssues <repo-name>

# Listar itens atualmente no projeto
node scripts/github_api.cjs listProjectItems <project-number>
```

### Ações
```bash
# Criar Issue e Vincular ao Projeto
node scripts/github_api.cjs createAndLinkIssue <project-number> <repo-name> "Título" "Descrição"

# Vincular Issue EXISTENTE ao Projeto
node scripts/github_api.cjs linkExistingIssue <project-number> <repo-name> <issue-number>
```

## Diretrizes para o Agente
- Sempre verifique se `GITHUB_TOKEN` está disponível no ambiente.
- Ao listar repositórios ou projetos, apresente as opções de forma clara para o usuário antes de prosseguir.
- Use `ask_user` para:
    - Selecionar o repositório alvo (ex: koda-server, koda-web).
    - Selecionar o projeto alvo (geralmente o #1).
    - Confirmar a criação de uma issue após rascunhar o conteúdo.
