import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth-utils'
import { isValidModality, isValidVariant } from '@/lib/api-validation'

export async function GET() {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { ends: true } } },
  })
  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const body = await req.json()
  const { modality, targetVariant = '1-SPOT', id } = body

  if (!isValidModality(modality)) {
    return NextResponse.json({ error: 'Invalid modality' }, { status: 400 })
  }
  if (!isValidVariant(targetVariant)) {
    return NextResponse.json({ error: 'Invalid target variant' }, { status: 400 })
  }

  const session = await prisma.session.create({
    data: {
      ...(id ? { id } : {}),
      modality,
      targetVariant,
      userId,
    },
  })
  return NextResponse.json(session, { status: 201 })
}
