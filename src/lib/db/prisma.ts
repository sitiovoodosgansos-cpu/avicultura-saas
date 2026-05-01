import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function resolveDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
}

function withConnectionLimit(url: string): string {
  // Em ambientes serverless (Vercel) cada lambda cria sua propria instancia
  // de PrismaClient. Sem connection_limit cada uma abre o pool padrao do
  // driver (~10 conexoes), estourando rapidamente o limite do Postgres em
  // burst de trafego ("Too many connections for role ..."). Forca 1 conexao
  // por lambda em producao.
  if (process.env.NODE_ENV !== "production") return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "1");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "20");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function createClient() {
  const baseUrl = resolveDatabaseUrl();
  if (!baseUrl) {
    throw new Error("DATABASE_URL not configured (or POSTGRES_PRISMA_URL missing).");
  }

  const url = withConnectionLimit(baseUrl);

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = url;
  }

  return new PrismaClient({
    datasourceUrl: url,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });
}

let instance: PrismaClient | undefined = global.prisma;

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!instance) {
      instance = createClient();
      if (process.env.NODE_ENV !== "production") {
        global.prisma = instance;
      }
    }

    return Reflect.get(instance as PrismaClient, prop, receiver);
  }
}) as PrismaClient;
