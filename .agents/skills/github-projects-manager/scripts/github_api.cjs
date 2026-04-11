const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('Erro: A variável de ambiente GITHUB_TOKEN não está definida.');
  process.exit(1);
}

const ORG = 'koda-logtech';

async function graphql(query, variables = {}) {
  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Gemini-CLI-Skill'
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json();
    if (json.errors) {
      console.error('Erro na API do GitHub:', JSON.stringify(json.errors, null, 2));
      process.exit(1);
    }
    return json.data;
  } catch (error) {
    console.error('Erro de conexão:', error.message);
    process.exit(1);
  }
}

const actions = {
  // Lista repositórios da organização
  listRepositories: async () => {
    const query = `
      query($org: String!) {
        organization(login: $org) {
          repositories(first: 20, orderBy: {field: UPDATED_AT, direction: DESC}) {
            nodes { name description }
          }
        }
      }
    `;
    const data = await graphql(query, { org: ORG });
    console.log(JSON.stringify(data.organization.repositories.nodes, null, 2));
  },

  // Lista projetos da organização
  listProjects: async () => {
    const query = `
      query($org: String!) {
        organization(login: $org) {
          projectsV2(first: 10) {
            nodes { id number title url }
          }
        }
      }
    `;
    const data = await graphql(query, { org: ORG });
    console.log(JSON.stringify(data.organization.projectsV2.nodes, null, 2));
  },

  // Busca IDs de Projeto e Repositório
  getProjectAndRepoIds: async (projectNumber, repoName) => {
    const query = `
      query($org: String!, $number: Int!, $repo: String!) {
        organization(login: $org) {
          projectV2(number: $number) { id }
          repository(name: $repo) { id }
        }
      }
    `;
    const data = await graphql(query, { org: ORG, number: parseInt(projectNumber), repo: repoName });
    return {
      projectId: data.organization.projectV2.id,
      repositoryId: data.organization.repository.id
    };
  },

  // Cria issue e adiciona ao projeto
  createAndLinkIssue: async (projectNumber, repoName, title, body = "") => {
    console.log(`Criando issue em ${repoName} para o Projeto #${projectNumber}...`);
    const { projectId, repositoryId } = await actions.getProjectAndRepoIds(projectNumber, repoName);

    // 1. Criar a Issue
    const createIssueQuery = `
      mutation($repoId: ID!, $title: String!, $body: String) {
        createIssue(input: {repositoryId: $repoId, title: $title, body: $body}) {
          issue { id url number }
        }
      }
    `;
    const issueData = await graphql(createIssueQuery, { repoId: repositoryId, title, body });
    const issueId = issueData.createIssue.issue.id;
    console.log(`Issue #${issueData.createIssue.issue.number} criada: ${issueData.createIssue.issue.url}`);

    // 2. Adicionar ao Projeto
    const addToProjectQuery = `
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
          item { id }
        }
      }
    `;
    await graphql(addToProjectQuery, { projectId, contentId: issueId });
    console.log(`Sucesso: Issue vinculada ao Projeto ${projectNumber} da ${ORG}.`);
  },

  // Vincula issue existente ao projeto
  linkExistingIssue: async (projectNumber, repoName, issueNumber) => {
    console.log(`Vinculando Issue #${issueNumber} do repo ${repoName} ao Projeto #${projectNumber}...`);
    
    const query = `
      query($org: String!, $number: Int!, $repo: String!, $issueNum: Int!) {
        organization(login: $org) {
          projectV2(number: $number) { id }
          repository(name: $repo) {
            issue(number: $issueNum) { id }
          }
        }
      }
    `;
    const data = await graphql(query, { 
      org: ORG, 
      number: parseInt(projectNumber), 
      repo: repoName, 
      issueNum: parseInt(issueNumber) 
    });

    const projectId = data.organization.projectV2.id;
    const issueId = data.organization.repository.issue.id;

    const addToProjectQuery = `
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
          item { id }
        }
      }
    `;
    await graphql(addToProjectQuery, { projectId, contentId: issueId });
    console.log(`Sucesso: Issue #${issueNumber} vinculada ao Projeto ${projectNumber}.`);
  },

  // Lista issues recentes de um repositório
  listIssues: async (repoName) => {
    const query = `
      query($org: String!, $repo: String!) {
        organization(login: $org) {
          repository(name: $repo) {
            issues(first: 10, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes { number title url }
            }
          }
        }
      }
    `;
    const data = await graphql(query, { org: ORG, repo: repoName });
    console.log(JSON.stringify(data.organization.repository.issues.nodes, null, 2));
  },

  // Lista itens do projeto
  listProjectItems: async (projectNumber) => {
    const query = `
      query($org: String!, $number: Int!) {
        organization(login: $org) {
          projectV2(number: $number) {
            items(first: 20) {
              nodes {
                id
                content {
                  ... on Issue { title number repository { name } }
                  ... on PullRequest { title number repository { name } }
                }
              }
            }
          }
        }
      }
    `;
    const data = await graphql(query, { org: ORG, number: parseInt(projectNumber) });
    console.log(JSON.stringify(data.organization.projectV2.items.nodes, null, 2));
  }
};

const action = process.argv[2];
const args = process.argv.slice(3);

if (actions[action]) {
  actions[action](...args).catch(err => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.error('Ação desconhecida. Use: listRepositories, listProjects, createAndLinkIssue, linkExistingIssue, listIssues, listProjectItems');
  process.exit(1);
}
