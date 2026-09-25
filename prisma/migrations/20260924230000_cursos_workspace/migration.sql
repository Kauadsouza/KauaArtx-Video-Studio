-- Cursos entra na lista de sistemas permitidos.
--
-- O schema do Prisma diz `app String`, e por isso eu tinha concluído que
-- bastava acrescentar o nome no código. Estava errado: o banco tem um CHECK
-- em três tabelas com os sistemas escritos um a um, e ele recusava 'cursos'
-- — a conta nem chegava a ser criada.
--
-- O CHECK está certo em existir; ele é a razão de o erro ter aparecido na
-- criação da conta, e não meses depois como lixo no banco. O que faltava era
-- incluí-lo aqui também.
--
-- Só alarga a lista: nenhuma linha existente deixa de passar.

ALTER TABLE public."MemberGrant"
  DROP CONSTRAINT IF EXISTS "MemberGrant_app_check";
ALTER TABLE public."MemberGrant"
  ADD CONSTRAINT "MemberGrant_app_check"
  CHECK (app IN ('hub', 'videos', 'study', 'university', 'cursos'));

ALTER TABLE public."MemberSession"
  DROP CONSTRAINT IF EXISTS "MemberSession_app_check";
ALTER TABLE public."MemberSession"
  ADD CONSTRAINT "MemberSession_app_check"
  CHECK (app IN ('hub', 'videos', 'study', 'university', 'cursos'));

ALTER TABLE public."MemberState"
  DROP CONSTRAINT IF EXISTS "MemberState_app_check";
ALTER TABLE public."MemberState"
  ADD CONSTRAINT "MemberState_app_check"
  CHECK (app IN ('hub', 'videos', 'study', 'university', 'cursos'));
