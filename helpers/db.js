import { PrismaClient } from "@prisma/client";

export const db = process.env.NODE_ENV === 'production'
  ? new PrismaClient()
  : globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}

db.$connect().catch((err) => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});