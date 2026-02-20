import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

// Parse the DATABASE_URL to extract the actual connection string
function parseConnectionString(url: string) {
  const dbUrl = new URL(url)
  if (dbUrl.protocol === 'prisma+postgres:') {
    const apiKey = dbUrl.searchParams.get('api_key')
    if (apiKey) {
      const decodedKey = JSON.parse(Buffer.from(apiKey, 'base64').toString())
      return decodedKey.databaseUrl
    }
  }
  return url
}

const connectionString = parseConnectionString(process.env.DATABASE_URL!)

// The prisma dev embedded database only supports 1 concurrent connection.
// Using max > 1 causes each extra parallel connection to wait ~10s,
// making all ORM queries with multiple includes extremely slow.
const pool = globalForPrisma.pool ?? new Pool({
  connectionString,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

const adapter = new PrismaPg(pool)

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.pool = pool
}
