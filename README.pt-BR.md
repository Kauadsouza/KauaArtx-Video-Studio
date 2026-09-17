# KauaArtx Video Studio

[English](README.md) · **Português** · [Español](README.es.md)

O sistema de produção do canal [@KauaArtx](https://www.youtube.com/@KauaArtx). Ele leva uma ideia até o vídeo publicado por um fluxo de oito etapas, mantendo roteiro, decisões e progresso no mesmo lugar.

[Abrir a aplicação](https://sistema-videos.vercel.app) · Requer autenticação

---

## Por que ele existe

Quadro de tarefas genérico não entende produção de vídeo: ele sabe que existe uma tarefa chamada "gravar", mas não sabe que gravar é percorrer os mesmos trechos que você escreveu e que depois vão ser editados um a um. Aqui o roteiro é a espinha do sistema, não um anexo.

## O fluxo

```text
Ideia → Roteiro → Gravação → Edição → Thumbnail e Título → Revisão → Agendado → Publicado
```

Cada etapa tem sua própria área de trabalho, com os campos que fazem sentido ali — gancho e referências na Ideia, opções de título na etapa de Título, aprendizados depois de publicado — em vez de um formulário genérico repetido oito vezes.

## O bloco de roteiro é a espinha

O vídeo é quebrado em blocos de tempo ("0–30s: falo tal coisa"). **É sempre o mesmo bloco mudando de estado**: nasce no Roteiro, vira item na Gravação e tarefa na Edição. Não são três listas separadas que você precisa manter em sincronia na cabeça.

Dois recursos nascem disso:

- **Linha do tempo contínua.** Cada bloco começa onde o anterior termina. Mudou o fim de um, o próximo acompanha e todos abaixo deslizam junto, preservando a duração de cada um. Um bloco nunca colapsa para zero nem anda para trás.
- **Modo leitura.** Um bloco por vez em letra grande, em tela cheia, com o tempo planejado daquele trecho e um cronômetro que fica âmbar se você passar dele. Setas passam o bloco, `P` liga o cronômetro, `Esc` fecha. É o que se usa na hora de gravar.

## Outras capacidades

- Quadro Kanban com arrastar e soltar entre as oito etapas.
- Checklists por etapa, editáveis e reordenáveis, guardados por vídeo.
- Assistente editorial opcional para roteiro, títulos e conceitos de thumbnail — com sugestões locais determinísticas quando nenhum modelo está configurado, para nunca depender de IA para funcionar.
- Exportação em JSON para backup portátil.
- Sistema de contas aprovadas que também atende os outros aplicativos do ecossistema.

## Decisões técnicas que valem menção

- **Autorização verificada no banco, não no cliente.** Todas as 18 operações de escrita passam por uma verificação que reescopa a consulta pelo dono do registro. Um membro não alcança a linha de outro, e nenhuma autorização confia em dado vindo do navegador.
- **Row Level Security de verdade.** As políticas cobrem as cinco tabelas de conta, não são decorativas.
- **Senha nunca reversível.** Hash com scrypt e salt por conta, comparação em tempo constante, e limite de tentativas por janela.
- **Credencial de IA só no servidor.** O endpoint valida a sessão, limita o tamanho do pedido e aplica teto de gerações por hora.
- **Migração aplicada pelo CI.** O deploy da Vercel não roda migração; um fluxo dedicado aplica o que está pendente quando o schema muda, evitando o código novo encontrar o banco velho.

## Tecnologias

Next.js 16, React 19, TypeScript, Prisma, PostgreSQL/Supabase, dnd-kit e Vercel.

## Desenvolvimento local

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run db:deploy
npm.cmd run dev
```

Variáveis de ambiente:

| Variável | Para que serve |
| --- | --- |
| `DATABASE_URL` | Conexão da aplicação, pelo pooler |
| `DIRECT_URL` | Conexão direta, usada pelas migrações |
| `APP_PASSWORD` | Senha do proprietário |
| `AUTH_SECRET` | Segredo aleatório que assina os cookies de sessão |
| `LLM_BASE_URL` | Endpoint compatível com OpenAI (opcional) |
| `LLM_MODEL` | Identificador do modelo (opcional) |
| `LLM_API_KEY` | Credencial do provedor — nunca exposta ao navegador |

Nunca versione um `.env` real. A aplicação falha fechada quando faltam os segredos de autenticação.

## Verificação

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd audit --omit=dev
```

## Mapa do repositório

```text
prisma/            Schema, migrações e dados de semente
src/actions/       Mutações autenticadas no servidor
src/app/           Rotas, endpoints e páginas
src/components/    Quadro e área de trabalho do vídeo
src/lib/           Autenticação, banco, linha do tempo e regras do fluxo
tests/             Testes de autenticação e da linha do tempo
```

## Situação

Ferramenta em uso real por um criador. Não é um SaaS multiempresa, e a IA externa é opcional, não uma dependência de execução.

Feito e mantido por [Kauã Diniz Souza](https://github.com/Kauadsouza).
