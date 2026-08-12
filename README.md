# Central de Comunicação Interna

Protótipo funcional de uma intranet corporativa para publicar comunicados, acompanhar confirmações de leitura, consultar documentos, eventos, pendências e indicadores.

## Tecnologias

- React 19 e TypeScript
- Vite
- React Router
- Lucide React
- Recharts
- Quill

## Executar localmente

Requisitos: Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Abra o endereço apresentado pelo Vite. A tela de login opera em modo demonstrativo e aceita qualquer usuário e senha não vazios. Ela não representa autenticação de produção.

### API multiempresa

```bash
npm run build:api
npm run dev:api
```

A API ficará disponível em `http://127.0.0.1:3333`. O marco atual inclui login demonstrativo, empresas, departamentos, usuários e bloqueio de acesso cruzado.

## Verificações

```bash
npm run lint
npm run build
npm run check
npm run test:api
```

O comando `check` executa lint e build em sequência.

## Estrutura

- `src/components`: layout e componentes compartilhados.
- `src/context`: estado dos comunicados e persistência local do protótipo.
- `src/data`: dados demonstrativos.
- `src/pages`: páginas carregadas sob demanda por rota.
- `src/utils`: utilitários de segurança e apresentação.
- `apps/api`: API e domínio multiempresa.
- `packages/contracts`: contratos compartilhados entre frontend e backend.
- `database`: schema PostgreSQL, RLS e dados demonstrativos.
- `docs`: decisões de arquitetura e segurança.

## Funcionalidades implementadas

- Dashboard e navegação responsiva.
- Login demonstrativo, sessão persistente opcional, rotas protegidas e logout.
- Central de suporte com abertura de chamado, protocolo e histórico local.
- Busca global dinâmica em comunicados.
- Listagem com busca, categoria e situação de leitura.
- Publicação de comunicados durante a sessão.
- Persistência local dos comunicados e confirmações de leitura.
- Sanitização conservadora do HTML produzido pelo editor.
- Biblioteca, calendário, links, pendências, leituras e relatórios demonstrativos.
- Foco visível, nomes acessíveis e modal de busca controlável pelo teclado.
- Divisão do código por rota para reduzir o carregamento inicial.

## Limites do protótipo

Os seguintes itens dependem de serviços corporativos e ainda não estão implementados:

- SSO/OIDC, validação de credenciais no servidor e recuperação real de senha.
- Permissões por perfil, unidade e departamento.
- API, banco de dados e armazenamento real de anexos.
- Workflow de rascunho, aprovação e versionamento.
- Auditoria imutável e relatórios oficiais.
- Integração com e-mail, calendário e diretório corporativo.

Antes de publicar em produção, substitua o armazenamento local por uma API autenticada, proteja as rotas no servidor e execute testes de acessibilidade e segurança.

## Design system

A base visual usa tokens CSS globais para cores, superfícies, texto, bordas, sombras e raios. Novos componentes devem reutilizar esses tokens, possuir estados `hover`, `focus-visible`, `disabled`, `loading` e `error`, e atender WCAG 2.2 AA.

Não inclua `node_modules` ao compartilhar o projeto. Distribua apenas o código e o `package-lock.json`; as dependências são reconstruídas com `npm install` ou `npm ci`.
