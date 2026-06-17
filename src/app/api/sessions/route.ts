import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import type { Modality, TargetVariant } from '@/lib/domain/types'

export async function GET() {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { ends: true } } },
  })
  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const modality = body.modality as Modality
  const targetVariant = (body.targetVariant as TargetVariant) ?? '1-SPOT'

  if (!['INDOOR', 'FLINT'].includes(modality)) {
    return NextResponse.json({ error: 'Invalid modality' }, { status: 400 })
  }

  const session = await prisma.session.create({
    data: { modality, targetVariant },
  })
  return NextResponse.json(session, { status: 201 })
}
