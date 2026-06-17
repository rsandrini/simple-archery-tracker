import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth-utils'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const { id } = await params
  const session = await prisma.session.findFirst({
    where: { id, userId },
    include: {
      ends: {
        orderBy: { index: 'asc' },
        include: { arrows: { orderBy: { index: 'asc' } } },
      },
    },
  })

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(session)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const { id } = await params
  const owned = await prisma.session.findFirst({ where: { id, userId }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json() as { notes?: string; rating?: number | null }
  const data: { notes?: string; rating?: number | null } = {}
  if (body.notes !== undefined) data.notes = body.notes
  if (body.rating !== undefined) data.rating = body.rating
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
  const session = await prisma.session.update({ where: { id }, data })
  return NextResponse.json(session)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const { id } = await params
  const owned = await prisma.session.findFirst({ where: { id, userId }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.session.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
