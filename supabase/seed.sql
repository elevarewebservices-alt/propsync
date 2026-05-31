-- PropSync — initial seed
-- Run once in Supabase → SQL Editor after schema.sql

INSERT INTO companies (id, nombre, email, plan_id)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Mi Empresa',
  'admin@miempresa.com',
  'agency'
);

INSERT INTO agents (id, company_id, nombre, email, rol)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Admin',
  'admin@miempresa.com',
  'owner'
);
