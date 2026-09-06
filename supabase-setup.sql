-- ===========================================================================
-- Setup completo do banco — Sistema de Produção de Vídeos (@KauaArtx)
-- Rodar no SQL Editor do Supabase. Seguro rodar mais de uma vez.
-- ===========================================================================

-- --- 1. Enum das 8 etapas -------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "Stage" AS ENUM (
    'IDEIA','ROTEIRO','GRAVACAO','EDICAO',
    'THUMBNAIL_TITULO','REVISAO','AGENDADO','POSTADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- --- 2. Tabelas ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Video" (
  "id"            TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "description"   TEXT NOT NULL DEFAULT '',
  "stage"         "Stage" NOT NULL DEFAULT 'IDEIA',
  "order"         INTEGER NOT NULL DEFAULT 0,
  "notes"         TEXT NOT NULL DEFAULT '',
  "thumbnailIdea" TEXT NOT NULL DEFAULT '',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- sem DEFAULT de propósito: o Prisma (@updatedAt) preenche em todo write.
  -- Pôr um default aqui criaria divergência com o schema.prisma.
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ScriptBlock" (
  "id"           TEXT NOT NULL,
  "videoId"      TEXT NOT NULL,
  "startSeconds" INTEGER NOT NULL DEFAULT 0,
  "endSeconds"   INTEGER NOT NULL DEFAULT 0,
  "content"      TEXT NOT NULL DEFAULT '',
  "order"        INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ScriptBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChecklistItem" (
  "id"      TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "stage"   "Stage" NOT NULL,
  "text"    TEXT NOT NULL,
  "done"    BOOLEAN NOT NULL DEFAULT false,
  "order"   INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- --- 3. Índices ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "Video_stage_order_idx"
  ON "Video"("stage", "order");
CREATE INDEX IF NOT EXISTS "ScriptBlock_videoId_order_idx"
  ON "ScriptBlock"("videoId", "order");
CREATE INDEX IF NOT EXISTS "ChecklistItem_videoId_stage_order_idx"
  ON "ChecklistItem"("videoId", "stage", "order");

-- --- 4. Chaves estrangeiras (apagar vídeo apaga roteiro e checklist) -------
DO $$ BEGIN
  ALTER TABLE "ScriptBlock" ADD CONSTRAINT "ScriptBlock_videoId_fkey"
    FOREIGN KEY ("videoId") REFERENCES "Video"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_videoId_fkey"
    FOREIGN KEY ("videoId") REFERENCES "Video"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================================================
-- 5. SEGURANÇA
-- O app fala com o banco via Prisma como dono das tabelas, então RLS não o
-- atrapalha. Estas linhas fecham o acesso pela API REST pública do Supabase
-- (anon / authenticated), que o app não usa.
-- ===========================================================================
ALTER TABLE "Video"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScriptBlock"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChecklistItem" ENABLE ROW LEVEL SECURITY;

-- Os papéis anon/authenticated só existem no Supabase. O bloco abaixo checa
-- antes de revogar, pra este script também rodar em qualquer outro Postgres.
DO $$
DECLARE
  papel TEXT;
BEGIN
  FOREACH papel IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = papel) THEN
      EXECUTE format('REVOKE ALL ON "Video" FROM %I', papel);
      EXECUTE format('REVOKE ALL ON "ScriptBlock" FROM %I', papel);
      EXECUTE format('REVOKE ALL ON "ChecklistItem" FROM %I', papel);
      RAISE NOTICE 'Acesso revogado para %', papel;
    END IF;
  END LOOP;
END $$;

-- ===========================================================================
-- 6. As 8 ideias iniciais (coluna "Ideia")
-- Conteúdo sobre a PREPARAÇÃO da viagem — ela só acontece no fim de 2026.
-- ON CONFLICT: rodar de novo não duplica.
-- ===========================================================================
INSERT INTO "Video" ("id","title","description","stage","order","updatedAt") VALUES
  ('seed_01','Vídeo de abertura do canal','Quem eu sou, por que decidi documentar tudo (não só a viagem, mas a preparação) e o que esperar dos próximos meses.','IDEIA',0,CURRENT_TIMESTAMP),
  ('seed_02','Por que só vou viajar no fim do ano','Vídeo transparente explicando por que estou começando a gravar agora mesmo assim. Gera expectativa sem enganar ninguém.','IDEIA',1,CURRENT_TIMESTAMP),
  ('seed_03','Planejando a viagem #1: escolhendo destino e roteiro','Mostrar a pesquisa, as decisões e os mapas.','IDEIA',2,CURRENT_TIMESTAMP),
  ('seed_04','Quanto custa se preparar pra morar/viajar fora','Conta aberta: Wise, câmbio, orçamento real.','IDEIA',3,CURRENT_TIMESTAMP),
  ('seed_05','Documentos e burocracia: o que ninguém te conta','Vistos, ETA, cartas de hospedagem e afins.','IDEIA',4,CURRENT_TIMESTAMP),
  ('seed_06','Contagem regressiva: X meses pra viagem','O que já resolvi e o que falta. Formato de série — pode repetir todo mês.','IDEIA',5,CURRENT_TIMESTAMP),
  ('seed_07','Bastidores de montar um canal do zero','Equipamento, aprendizado de edição, primeiros erros.','IDEIA',6,CURRENT_TIMESTAMP),
  ('seed_08','Perguntas e respostas com quem está acompanhando','Engajamento — mostra que tem gente real acompanhando a jornada.','IDEIA',7,CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Checklist padrão da etapa "Ideia" para cada um dos 8 vídeos
WITH itens("txt","ord") AS (
  VALUES
    ('Definir tema central do vídeo', 0),
    ('Definir gancho (hook) dos primeiros 5 segundos', 1),
    ('Pesquisar 2-3 referências de vídeos parecidos', 2),
    ('Checar se a ideia é coerente com a fase atual (ainda não estou viajando)', 3)
)
INSERT INTO "ChecklistItem" ("id","videoId","stage","text","done","order")
SELECT v."id" || '_ci' || i."ord", v."id", 'IDEIA'::"Stage", i."txt", false, i."ord"
FROM "Video" v CROSS JOIN itens i
WHERE v."id" LIKE 'seed_%'
ON CONFLICT ("id") DO NOTHING;

-- --- 7. Conferência final --------------------------------------------------
SELECT
  (SELECT count(*) FROM "Video")         AS videos,
  (SELECT count(*) FROM "ChecklistItem") AS itens_checklist,
  (SELECT count(*) FROM "ScriptBlock")   AS blocos_roteiro;
