import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function resolveDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
}

function createClient() {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL not configured (or POSTGRES_PRISMA_URL missing).");
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = url;
  }

  return new PrismaClient({
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
