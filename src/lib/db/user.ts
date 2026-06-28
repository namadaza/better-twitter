import { eq } from 'drizzle-orm'
import { db } from './client'
import {
  user,
  type User,
} from './schema'

export async function getCurrentUser({ id }: { id: number }): Promise<User | null> {
  const [row] = await db
    .select()
    .from(user)
    .where(eq(user.id, id))
    .limit(1)
  return row ?? null
}
