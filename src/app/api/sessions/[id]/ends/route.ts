import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const { index } = await req.json() as { index: number }

  // Upsert: return existing end if already created (race-condition safe)
  const existing = await prisma.end.findFirst({ where: { sessionId, index } })
  if (existing) return NextResponse.json(existing)

  const end = await prisma.end.create({ data: { sessionId, index } })
  return NextResponse.json(end, { status: 201 })
}
