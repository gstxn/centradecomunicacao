# Arquitetura multiempresa

## Contexto de acesso

Toda requisição autenticada possui quatro elementos:

1. usuário;
2. sessão;
3. empresa ativa;
4. membership ativa do usuário naquela empresa.

O frontend informa a empresa desejada com `X-Company-ID`. A API nunca confia isoladamente nesse valor: ela busca uma membership ativa antes de executar a operação.

## Barreiras de isolamento

O projeto aplica isolamento em camadas:

- resolução do tenant na API;
- verificação de papel e permissão;
- `company_id` obrigatório nos registros corporativos;
- chaves estrangeiras compostas para impedir associações entre tenants;
- Row-Level Security no PostgreSQL;
- testes automatizados de acesso cruzado.

## Fluxo

```text
Login
  -> sessão do usuário
  -> lista de memberships
  -> empresa ativa
  -> X-Company-ID
  -> Tenant Resolver
  -> autorização
  -> SET LOCAL app.company_id
  -> consulta protegida pela RLS
```

## Dados demonstrativos

| Empresa | Usuário | Senha |
|---|---|---|
| Central de Exames | admin@central.test | demo123 |
| GSS | admin@gss.test | demo123 |
| Ambas, como auditor | auditor@saas.test | demo123 |

A API consulta o PostgreSQL com um papel de runtime sem privilégios de criação e sem
`BYPASSRLS`. O papel que aplica o schema é separado do papel usado nas requisições. As
sessões ainda permanecem em memória e devem migrar para um mecanismo compartilhado antes
de executar mais de uma instância da API.

## Regra de implementação

Nenhuma função de domínio deve aceitar apenas o ID de um recurso corporativo. Ela deve receber também um contexto de tenant validado ou executar a consulta dentro de uma transação que tenha definido `app.company_id`.

O contexto de tenant é criado exclusivamente por `resolveTenant`. As consultas corporativas
usam `withTenantTransaction`, que configura `app.company_id` localmente na mesma conexão.
As tabelas corporativas usam `FORCE ROW LEVEL SECURITY`; portanto, esquecer o contexto
resulta em negação de acesso, e não em leitura global.
