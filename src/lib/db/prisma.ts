import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { ocopPrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (globalForPrisma.ocopPrisma) return globalForPrisma.ocopPrisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required at runtime.");
  }

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  if (process.env.NODE_ENV !== "production") globalForPrisma.ocopPrisma = client;
  return client;
}
