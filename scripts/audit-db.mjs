import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
for(const line of fs.readFileSync('.env','utf8').split(/\r?\n/)) {
  const match=line.match(/^([A-Z_]+)=(.*)$/); if(match&&!process.env[match[1]]) process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');
}
const connection=new URL(process.env.DATABASE_URL);
connection.searchParams.set('connect_timeout','10'); connection.searchParams.set('pool_timeout','10');
console.log(JSON.stringify({host:connection.hostname,project:decodeURIComponent(connection.username).split('.')[1]??'unknown'}));
const prisma=new PrismaClient({datasourceUrl:connection.toString(),log:[]});
try {
  const tables=await prisma.$queryRaw`select c.relname as name,c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('Video','ScriptBlock','ChecklistItem')`;
  const grants=await prisma.$queryRaw`select table_name,grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name in ('Video','ScriptBlock','ChecklistItem') and grantee in ('anon','authenticated')`;
  const count=await prisma.video.count();
  console.log(JSON.stringify({tables,grants,videoCount:count}));
} catch(error) { console.log(JSON.stringify({status:'unavailable',code:error.code??'connection_error'}));process.exitCode=1; }
finally { await prisma.$disconnect(); }
