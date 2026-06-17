import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { scoreToPoints, isX } from '@/lib/domain/scoring'
import type { ScoreValue } from '@/lib/domain/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { score } = (await req.json()) as { score: ScoreValue }

  const arrow = await prisma.arrow.update({
    where: { id },
    data: {
      score,
      points: scoreToPoints(score),
      isX: isX(score),
    },
  })

  return NextResponse.json(arrow)
}
