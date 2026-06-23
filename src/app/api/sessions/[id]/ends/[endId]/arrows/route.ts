import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { Prisma } from '@/generated/prisma/client'
import { resolveDoubleHit, scoreToPoints, isX } from '@/lib/domain/scoring'
import type { ArrowData, ScoreValue } from '@/lib/domain/types'
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth-utils'
import { isValidScore } from '@/lib/api-validation'
import { validateArrowCoords } from '@/lib/arrow-validation'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; endId: string }> }
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const { id: sessionId, endId } = await params

  const owned = await prisma.session.findFirst({ where: { id: sessionId, userId }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  // Verify endId belongs to sessionId
  const end = await prisma.end.findFirst({
    where: { id: endId, sessionId },
    include: { arrows: { orderBy: { index: 'asc' } } },
  })

  if (!end) {
    return NextResponse.json({ error: 'End not found' }, { status: 404 })
  }

  const { index, score, x, y, distance, spotIndex, id: arrowId } = body

  if (!isValidScore(score)) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
  }

  const coordError = validateArrowCoords(x, y)
  if (coordError) {
    return NextResponse.json({ error: coordError }, { status: 400 })
  }

  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index !== end.arrows.length) {
    return NextResponse.json({ error: 'Arrow index conflict' }, { status: 409 })
  }

  const newArrow: ArrowData = {
    id: 'pending',
    index,
    score,
    points: scoreToPoints(score),
    isX: isX(score),
    x,
    y,
    distance,
    spotIndex: spotIndex ?? null,
  }

  const existingArrows: ArrowData[] = end.arrows.map(a => ({
    id: a.id,
    index: a.index,
    score: a.score as ScoreValue,
    points: a.points,
    isX: a.isX,
    x: a.x,
    y: a.y,
    distance: a.distance ?? undefined,
    spotIndex: a.spotIndex ?? null,
  }))

  const resolved = resolveDoubleHit(existingArrows, newArrow)

  // Apply any changes to existing arrows (double-hit resolution)
  const updatedExisting: ArrowData[] = []
  for (const arrow of resolved.slice(0, existingArrows.length)) {
    const orig = existingArrows.find(a => a.id === arrow.id)
    if (orig && (orig.score !== arrow.score || orig.points !== arrow.points)) {
      await prisma.arrow.update({
        where: { id: arrow.id },
        data: { score: arrow.score, points: arrow.points, isX: arrow.isX },
      })
      updatedExisting.push(arrow)
    }
  }

  const resolvedNew = resolved[resolved.length - 1]

  // Create the new arrow
  try {
    const created = await prisma.arrow.create({
      data: {
        ...(arrowId ? { id: arrowId } : {}),
        endId,
        index,
        score: resolvedNew.score,
        points: resolvedNew.points,
        isX: resolvedNew.isX,
        x,
        y,
        distance: distance ?? null,
        spotIndex: spotIndex ?? null,
      },
    })

    return NextResponse.json({ arrow: created, updatedArrows: updatedExisting }, { status: 201 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'conflict' }, { status: 409 })
    }
    throw e
  }
}
