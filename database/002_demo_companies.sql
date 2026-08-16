BEGIN;

INSERT INTO companies (id, name, slug) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Central de Exames', 'central-exames');

INSERT INTO departments (company_id, name, code) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Tecnologia da Informação', 'TI'),
  ('11111111-1111-4111-8111-111111111111', 'Qualidade', 'QUAL'),
  ('11111111-1111-4111-8111-111111111111', 'Recursos Humanos', 'RH');

COMMIT;
