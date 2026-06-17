import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      ends: {
        orderBy: { index: 'asc' },
        include: { arrows: { orderBy: { index: 'asc' } } },
      },
    },
  })

  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(session)
}
