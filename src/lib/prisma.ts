import { PrismaClient } from "@prisma/client";

// Em dev o Next recarrega os módulos a cada edição; sem esse cache global
// você acaba abrindo uma conexão nova a cada hot-reload e estoura o limite
// de conexões do Neon.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
