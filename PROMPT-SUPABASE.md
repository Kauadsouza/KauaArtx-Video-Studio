# Prompt para a extensão do Claude (Claude in Chrome)

Abra o Supabase logado, ative a extensão e cole tudo abaixo da linha.

---

Você vai configurar meu projeto Supabase do início ao fim. Trabalhe de forma
autônoma: **execute os passos sem me pedir confirmação a cada um.** Só pare se
bater num dos bloqueios listados no final.

Projeto: **"Kauadsouza's Project"** (ref `ulvvehewcbhyrcpgkfyb`), região
`ca-central-1`. Já existe e ainda não tem migrations.

O banco está vazio e é um projeto pessoal meu — pode criar as tabelas e inserir
os dados à vontade. A única coisa que você **nunca** deve fazer é apagar dados
que já existam.

**Contexto:** app Next.js + Prisma na Vercel. Ele fala com o Postgres
diretamente via Prisma — não usa supabase-js, nem Auth, nem Storage, nem
Realtime. O Supabase aqui é só o banco.

---

## PASSO 1 — Criar as tabelas e popular os dados

Abra o **SQL Editor** (menu lateral) → **New query**, cole o SQL inteiro abaixo
e clique em **Run**.

Ele cria 3 tabelas, os índices, as chaves estrangeiras, liga a segurança e
insere 8 registros iniciais. É seguro rodar mais de uma vez — se algo já
existir, ele ignora em vez de dar erro.

```sql
-- Enum das 8 etapas
DO $$ BEGIN
  CREATE TYPE "Stage" AS ENUM (
    'IDEIA','ROTEIRO','GRAVACAO','EDICAO',
    'THUMBNAIL_TITULO','REVISAO','AGENDADO','POSTADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Video" (
  "id"            TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "description"   TEXT NOT NULL DEFAULT '',
  "stage"         "Stage" NOT NULL DEFAULT 'IDEIA',
  "order"         INTEGER NOT NULL DEFAULT 0,
  "notes"         TEXT NOT NULL DEFAULT '',
  "thumbnailIdea" TEXT NOT NULL DEFAULT '',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

CREATE INDEX IF NOT EXISTS "Video_stage_order_idx"
  ON "Video"("stage", "order");
CREATE INDEX IF NOT EXISTS "ScriptBlock_videoId_order_idx"
  ON "ScriptBlock"("videoId", "order");
CREATE INDEX IF NOT EXISTS "ChecklistItem_videoId_stage_order_idx"
  ON "ChecklistItem"("videoId", "stage", "order");

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

-- Segurança: fecha o acesso pela API REST pública (o app não a usa)
ALTER TABLE "Video"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScriptBlock"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChecklistItem" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE papel TEXT;
BEGIN
  FOREACH papel IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = papel) THEN
      EXECUTE format('REVOKE ALL ON "Video" FROM %I', papel);
      EXECUTE format('REVOKE ALL ON "ScriptBlock" FROM %I', papel);
      EXECUTE format('REVOKE ALL ON "ChecklistItem" FROM %I', papel);
    END IF;
  END LOOP;
END $$;

-- 8 ideias iniciais
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

SELECT
  (SELECT count(*) FROM "Video")         AS videos,
  (SELECT count(*) FROM "ChecklistItem") AS itens_checklist;
```

**Resultado esperado:** `videos = 8`, `itens_checklist = 32`.
Se os números baterem, o banco está pronto. Me diga o que apareceu.

---

## PASSO 2 — Desligar a API REST pública

Vá em **Project Settings → API** (ou **API Settings → Data API**) e procure
**Exposed schemas**.

Remova `public` da lista e salve. Se existir a opção de desabilitar a Data API
inteira, use ela — é melhor ainda.

Anote o que estava antes e o que ficou depois. **Pode salvar sem me perguntar.**

---

## PASSO 3 — Checar restrições de rede

Em **Project Settings → Database**, procure **Network Restrictions**.

A Vercel usa IPs dinâmicos, então qualquer allowlist derruba a conexão. Se
houver restrição ativa, desative (deixe aberto para todos os IPs) e me avise.

Veja também se aparece algum aviso sobre **IPv4/IPv6** e me relate.

---

## PASSO 4 — Pegar as duas connection strings

Clique em **Connect** (topo da tela) ou vá em
**Project Settings → Database → Connection string**. Se houver aba **ORMs** ou
**Prisma**, prefira ela.

Copie as duas, exatamente como aparecem:

- **Transaction pooler** — porta **6543**
- **Direct connection / Session pooler** — porta **5432**

A senha aparece mascarada como `[YOUR-PASSWORD]`. **Deixe assim.** Não tente
descobrir, resetar nem preencher — eu faço isso depois.

---

## PASSO 5 — Confirmar que deu certo

Abra o **Table Editor** e confirme que existem as tabelas `Video`,
`ScriptBlock` e `ChecklistItem`, e que `Video` tem 8 linhas.

---

## Onde você DEVE parar e me chamar

- Qualquer tela pedindo **senha**, **cartão**, **plano pago** ou **aceite de
  termos**
- Alguma tabela já existia com dados dentro — **não apague nada**, me avise
- Qualquer erro no SQL que você não consiga resolver relendo a mensagem

---

## Me entregue no final

```
SQL:                videos = <n>, itens_checklist = <n>
SCHEMAS EXPOSTOS:   <antes> → <depois>
RESTRIÇÃO DE REDE:  <tinha? desativou?>
IPv4/IPv6:          <o que apareceu>
POOLER (6543):      <string completa com [YOUR-PASSWORD]>
DIRETA (5432):      <string completa com [YOUR-PASSWORD]>
TABELAS:            <confirmadas? Video tem 8 linhas?>
PROBLEMAS:          <o que travou, se travou>
```

---

# Depois — o que fazer com o resultado

1. **A senha do banco:** abra o arquivo `.env` na pasta do projeto e troque
   `SUASENHA` pela senha real do Postgres, nas duas linhas. Não precisa colar
   no chat.
2. Me mande aqui no Claude Code o resumo que a extensão gerou (sem a senha).

Eu configuro na Vercel, faço o deploy e valido o board em produção.
