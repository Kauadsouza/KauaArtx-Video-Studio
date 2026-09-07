import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hashPassword, matchesPassword, memberApp, memberIdentity, requireHubOwner } from '../src/lib/member-auth';
import { prisma } from '../src/lib/prisma';

test('passwords are salted, non-reversible hashes and compare correctly', async () => {
  const password = 'test-only-password-42';
  const first = await hashPassword(password); const second = await hashPassword(password);
  assert.notEqual(first, second); assert.ok(!first.includes(password));
  assert.equal(await matchesPassword(password, first), true);
  assert.equal(await matchesPassword('incorrect-password', first), false);
});
test('invalid app identifiers never select a workspace', () => {
  assert.throws(() => memberApp('hub')); assert.throws(() => memberApp('owner')); assert.equal(memberApp('study'), 'study');
});
test('session identity rejects missing tokens, expired and cross-app sessions; approval is rechecked', async () => {
  const originalSession = prisma.memberSession.findUnique; const originalGrant = prisma.memberGrant.findUnique;
  const token = 'a'.repeat(64);
  try {
    await assert.rejects(memberIdentity(undefined,'videos'));
    prisma.memberSession.findUnique = (async () => ({ digest:'x', principal: 'account-a', app: 'videos', expiresAt: new Date(Date.now()+10000) })) as unknown as typeof originalSession;
    prisma.memberGrant.findUnique = (async () => ({ memberId:'account-a', app:'videos', status: 'approved', updatedAt:new Date() })) as unknown as typeof originalGrant;
    assert.equal(await memberIdentity(token,'videos'),'account-a');
    await assert.rejects(memberIdentity(token,'study'));
    for (const status of ['pending','rejected','revoked']) { prisma.memberGrant.findUnique = (async () => ({ memberId:'account-a', app:'videos', status, updatedAt:new Date() })) as unknown as typeof originalGrant; await assert.rejects(memberIdentity(token,'videos')); }
    prisma.memberSession.findUnique = (async () => ({ digest:'x', principal:'owner', app:'videos', expiresAt: new Date(0) })) as unknown as typeof originalSession;
    await assert.rejects(memberIdentity(token,'videos'));
  } finally { prisma.memberSession.findUnique = originalSession; prisma.memberGrant.findUnique = originalGrant; }
});
test('admin authorization validates the provider response, not a client owner claim', async () => {
  const fetchBefore = globalThis.fetch;
  const old = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, email:process.env.HUB_ALLOWED_EMAIL };
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.invalid'; process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test-key'; process.env.HUB_ALLOWED_EMAIL='owner@example.test';
    globalThis.fetch = async () => Response.json({ id:'another-account', email:'someone@example.test' });
    await assert.rejects(requireHubOwner('test-token'));
    globalThis.fetch = async () => Response.json({ id:'verified-owner', email:'owner@example.test' });
    assert.equal(await requireHubOwner('test-token'),'verified-owner');
    globalThis.fetch = async () => new Response(null,{status:401});
    await assert.rejects(requireHubOwner('test-token'));
  } finally { globalThis.fetch=fetchBefore; for(const [key,value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL:old.url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:old.key,HUB_ALLOWED_EMAIL:old.email })) { if(value===undefined) delete process.env[key]; else process.env[key]=value; } }
});
test('every exported video mutation enforces record ownership', () => {
  const source = readFileSync(new URL('../src/actions/videos.ts',import.meta.url),'utf8');
  for(const match of source.matchAll(/export async function (\w+)([\s\S]*?)(?=\nexport |$)/g)) {
    assert.match(match[2], match[1]==='createVideo' ? /const ownerId = await requireSession/ : /await require(Video|Block|Item)\(/, match[1]);
  }
  const queries = readFileSync(new URL('../src/lib/queries.ts',import.meta.url),'utf8');
  assert.match(queries,/where: \{ ownerId \}/); assert.match(queries,/where: \{ id, ownerId \}/);
});
