# Melhorias aplicadas

## Marco SaaS multiempresa — fundação

- Criada API Node.js/TypeScript executável em `apps/api`.
- Criados contratos compartilhados em `packages/contracts`.
- Modeladas empresas, usuários, memberships, departamentos, unidades, papéis e permissões.
- Adicionado schema PostgreSQL com chaves compostas e Row-Level Security.
- Adicionados tenants demonstrativos “Central de Exames” e “GSS”.
- Implementada resolução de empresa por sessão e `X-Company-ID`.
- Implementado bloqueio de acesso cruzado com resposta HTTP 403.
- Adicionados cinco testes automatizados de isolamento entre empresas.
- Documentada a arquitetura e adicionadas variáveis de ambiente de exemplo.

## Qualidade técnica

- Corrigidos todos os erros de TypeScript e lint.
- Convertido `react-quill.d.ts` para UTF-8.
- Adicionado `npm run check` para validar lint e build.
- Rotas carregadas sob demanda, reduzindo o pacote inicial.

## Funcionalidades

- Adicionada tela de login redesenhada e apresentada antes do painel.
- Adicionadas sessão demonstrativa, proteção de rotas, redirecionamento e logout.
- Criada Central de Suporte funcional com protocolo e histórico local de chamados.
- Corrigido o botão “Abrir chamado” da sidebar para abrir o novo fluxo de suporte.
- Comunicados e confirmações de leitura persistem no armazenamento local.
- Busca global consulta os comunicados existentes.
- Listagem de comunicados possui busca e filtros funcionais.
- Links decorativos do dashboard foram ligados a rotas reais.
- Publicação valida título, conteúdo e tamanho de anexos.
- HTML do editor é sanitizado antes da exibição.

## Acessibilidade

- Botões de ícone possuem nomes acessíveis.
- Modal de busca aceita Escape, mantém o foco contido e devolve o foco ao fechar.
- Campos principais possuem rótulos associados.
- Adicionado foco visível global e utilitário `sr-only`.
- Imagem do banner possui descrição mais informativa.
- Links sem destino foram removidos ou substituídos.

## Identidade visual

- Login ganhou direção visual própria, mensagem institucional e componentes de confiança.
- Sidebar recebeu tratamento de marca, profundidade e chamada de suporte mais evidente.
- Cabeçalho ganhou ação de logout e refinamentos de interação.

## Documentação

- README reescrito com instalação, arquitetura, verificações, limites e próximos passos.

## Pendências que exigem infraestrutura

- SSO/OIDC e proteção no servidor.
- API e banco de dados.
- Upload real de anexos.
- Permissões por perfil e unidade.
- Workflow de aprovação, auditoria e integrações corporativas.
