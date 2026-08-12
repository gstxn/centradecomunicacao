BEGIN;

INSERT INTO companies (id, name, slug) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Central de Exames', 'central-exames'),
  ('22222222-2222-4222-8222-222222222222', 'GSS', 'gss');

INSERT INTO departments (company_id, name, code) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Tecnologia da Informação', 'TI'),
  ('11111111-1111-4111-8111-111111111111', 'Qualidade', 'QUAL'),
  ('11111111-1111-4111-8111-111111111111', 'Recursos Humanos', 'RH'),
  ('22222222-2222-4222-8222-222222222222', 'Tecnologia da Informação', 'TI'),
  ('22222222-2222-4222-8222-222222222222', 'Qualidade', 'QUAL'),
  ('22222222-2222-4222-8222-222222222222', 'Administração', 'ADM');

COMMIT;
