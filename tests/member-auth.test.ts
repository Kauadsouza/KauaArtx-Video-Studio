import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { memberIdentity } from '../src/lib/member-auth';
import { prisma } from '../src/lib/prisma';

/*
  O que sobrou aqui depois que o serviço de contas foi para o Hub.

  Senha, cadastro, aprovação e emissão de sessão são testados lá, junto do
  código. Este sistema não faz nada disso: ele só confere de quem é o cookie,
  e guarda as tabelas enquanto o banco ainda mora aqui.
*/

test('a sessão é conferida a cada pedido, não só na entrada', async () => {
  const sessaoOriginal = prisma.memberSession.findUnique;
  const grantOriginal = prisma.memberGrant.findUnique;
  const token = 'a'.repeat(64);
  try {
    await assert.rejects(memberIdentity(undefined, 'videos'));

    prisma.memberSession.findUnique = (async () => ({ digest: 'x', principal: 'account-a', app: 'videos', expiresAt: new Date(Date.now() + 10000) })) as unknown as typeof sessaoOriginal;
    prisma.memberGrant.findUnique = (async () => ({ memberId: 'account-a', app: 'videos', status: 'approved', updatedAt: new Date() })) as unknown as typeof grantOriginal;
    assert.equal(await memberIdentity(token, 'videos'), 'account-a');

    // Revogar no Hub tem efeito na hora: a tela aberta para de gravar.
    for (const status of ['pending', 'rejected', 'revoked']) {
      prisma.memberGrant.findUnique = (async () => ({ memberId: 'account-a', app: 'videos', status, updatedAt: new Date() })) as unknown as typeof grantOriginal;
      await assert.rejects(memberIdentity(token, 'videos'));
    }

    prisma.memberSession.findUnique = (async () => ({ digest: 'x', principal: 'owner', app: 'videos', expiresAt: new Date(0) })) as unknown as typeof sessaoOriginal;
    await assert.rejects(memberIdentity(token, 'videos'), 'sessão vencida não vale nem para o dono');
  } finally {
    prisma.memberSession.findUnique = sessaoOriginal;
    prisma.memberGrant.findUnique = grantOriginal;
  }
});

test('o banco aceita todos os sistemas que existem', () => {
  /*
    Este teste existe por causa de um erro que já custou caro.

    O schema do Prisma declara `app String`, e eu concluí daí que acrescentar um
    sistema era só mexer no código. Não é: o Postgres tem um CHECK em três
    tabelas com os nomes escritos um a um, e ele recusava o sistema novo. A
    conta nem chegava a ser criada, e o erro saía como falha genérica.

    A lista abaixo tem que casar com SISTEMAS, no Hub. Se um sistema novo for
    criado lá e a migração não vier junto, é aqui que isso aparece.
  */
  const sistemas = ['hub', 'videos', 'study', 'university', 'cursos'];
  const migracoes = [
    '../prisma/migrations/20260908012000_hub_member_access/migration.sql',
    '../prisma/migrations/20260924230000_cursos_workspace/migration.sql',
  ].map(caminho => readFileSync(new URL(caminho, import.meta.url), 'utf8'));

  // A última migração é a que vale: ela redefine as três restrições.
  const atual = migracoes[migracoes.length - 1];
  for (const tabela of ['MemberGrant', 'MemberSession', 'MemberState']) {
    const check = atual.slice(atual.indexOf(`"${tabela}_app_check"\n  CHECK`));
    const lista = check.slice(0, check.indexOf(';'));
    for (const sistema of sistemas) {
      assert.ok(lista.includes(`'${sistema}'`), `${tabela} precisa aceitar '${sistema}'`);
    }
  }
});

test('toda gravação de vídeo confere de quem é o registro', () => {
  const fonte = readFileSync(new URL('../src/actions/videos.ts', import.meta.url), 'utf8');
  for (const match of fonte.matchAll(/export async function (\w+)([\s\S]*?)(?=\nexport |$)/g)) {
    assert.match(match[2], match[1] === 'createVideo' ? /const ownerId = await requireSession/ : /await require(Video|Block|Item)\(/, match[1]);
  }
  const queries = readFileSync(new URL('../src/lib/queries.ts', import.meta.url), 'utf8');
  assert.match(queries, /where: \{ ownerId \}/);
  assert.match(queries, /where: \{ id, ownerId \}/);
});

test('a rota que grava o cookie confere o token antes, e só aceita a própria origem', () => {
  const rota = readFileSync(new URL('../src/app/api/sessao/route.ts', import.meta.url), 'utf8');
  assert.match(rota, /memberIdentity\(token, ['"]videos['"]\)/, 'token não conferido não pode virar cookie');
  assert.match(rota, /origem === new URL\(request\.url\)\.origin/, 'outro site não escolhe a sessão deste');
  assert.match(rota, /httpOnly: true/);
});
