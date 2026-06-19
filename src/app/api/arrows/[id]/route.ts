import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { scoreToPoints, isX } from '@/lib/domain/scoring'
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth-utils'
import { isValidScore } from '@/lib/api-validation'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const { id } = await params
  const arrow = await prisma.arrow.findFirst({
    where: { id },
    include: { end: { include: { session: { select: { userId: true } } } } },
  })
  if (!arrow || arrow.end.session.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.arrow.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const { id } = await params
  const arrow = await prisma.arrow.findFirst({
    where: { id },
    include: { end: { include: { session: { select: { userId: true } } } } },
  })
  if (!arrow || arrow.end.session.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { score } = await req.json()

  if (!isValidScore(score)) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
  }

  const updated = await prisma.arrow.update({
    where: { id },
    data: {
      score,
      points: scoreToPoints(score),
      isX: isX(score),
    },
  })

  return NextResponse.json(updated)
}
