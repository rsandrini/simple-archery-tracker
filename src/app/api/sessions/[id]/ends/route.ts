import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth-utils'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const { id: sessionId } = await params

  const owned = await prisma.session.findFirst({ where: { id: sessionId, userId }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { index } = await req.json() as { index: number }

  // Upsert: return existing end if already created (race-condition safe)
  const existing = await prisma.end.findFirst({ where: { sessionId, index } })
  if (existing) return NextResponse.json(existing)

  const end = await prisma.end.create({ data: { sessionId, index } })
  return NextResponse.json(end, { status: 201 })
}
