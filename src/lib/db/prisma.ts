import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
  const dbPath = dbUrl.replace('file:', '')
  const absolutePath = path.resolve(process.cwd(), dbPath)
  const adapter = new PrismaBetterSqlite3({ url: absolutePath })
  return new PrismaClient({ adapter })
}

const prisma = globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

export default prisma
