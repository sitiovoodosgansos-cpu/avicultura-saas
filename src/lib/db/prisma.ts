import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });
}

let instance: PrismaClient | undefined = global.prisma;

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!instance) {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL não configurada.");
      }
      instance = createClient();
      if (process.env.NODE_ENV !== "production") {
        global.prisma = instance;
      }
    }

    return Reflect.get(instance as PrismaClient, prop, receiver);
  }
}) as PrismaClient;
