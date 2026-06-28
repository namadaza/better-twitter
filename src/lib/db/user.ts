import { eq } from 'drizzle-orm'
import { db } from './client'
import {
  user,
  type User,
} from './schema'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function getUser({ id }: { id: string }): Promise<User | null> {
  const [row] = await db
    .select()
    .from(user)
    .where(eq(user.id, id))
    .limit(1)
  return row ?? null
}

export const getUserSession = async () => {
  const session = await auth.api.getSession({
    headers: await headers()
  })
  return session ?? null
}
