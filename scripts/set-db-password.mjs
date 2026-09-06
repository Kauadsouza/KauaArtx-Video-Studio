/**
 * Grava a senha do Postgres nas duas connection strings do .env.
 *
 * Rodar:  node scripts/set-db-password.mjs
 *
 * A senha é digitada no seu terminal (sem aparecer na tela) e vai direto pro
 * arquivo. Não passa por chat, log nem histórico de comandos.
 *
 * Cuida de um detalhe que quebra silenciosamente: senha em connection string
 * é parte de uma URL, então caracteres como @ : / ? # & precisam ser
 * percent-encoded. Colar a senha crua costuma dar "invalid port number" ou
 * autenticação falhando sem explicação.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const ENV_PATH = new URL("../.env", import.meta.url);

function perguntarSenha() {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const stdin = process.stdin;

    process.stdout.write("Senha do Postgres (não aparece enquanto digita): ");

    // Silencia o eco dos caracteres digitados.
    const aoEscrever = stdin.isTTY ? () => {} : null;
    if (aoEscrever) {
      rl._writeToOutput = aoEscrever;
    }

    rl.question("", (resposta) => {
      rl.close();
      process.stdout.write("\n");
      resolve(resposta);
    });
  });
}

const senha = (await perguntarSenha()).trim();

if (!senha) {
  console.error("\n✗ Nenhuma senha digitada. Nada foi alterado.");
  process.exit(1);
}

// A senha vira parte de uma URL — precisa ser escapada.
const senhaEscapada = encodeURIComponent(senha);

let env = readFileSync(ENV_PATH, "utf8");

const antes = env;
env = env.replace(/SUASENHA/g, senhaEscapada);

if (env === antes) {
  console.error(
    "\n✗ Não encontrei o marcador SUASENHA no .env.\n" +
      "  A senha talvez já tenha sido preenchida antes. Nada foi alterado.",
  );
  process.exit(1);
}

writeFileSync(ENV_PATH, env, "utf8");

const ocorrencias = (antes.match(/SUASENHA/g) || []).length;
console.log(`✓ Senha gravada no .env (${ocorrencias} lugares).`);
if (senhaEscapada !== senha) {
  console.log("  Continha caractere especial — escapei pra URL automaticamente.");
}
console.log("\nAgora volte no Claude Code e diga 'pronto'.");
