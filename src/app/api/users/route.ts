import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import prisma from '@/lib/db/prisma'
import { validateRegistrationInput } from '@/lib/auth-validation'

export async function POST(req: NextRequest) {
  const body = await req.json() as { email?: string; password?: string; name?: string }
  const { email: rawEmail = '', password = '', name } = body
  const email = rawEmail.toLowerCase()

  const validationError = validateRegistrationInput(email, password)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const passwordHash = await hash(password, 12)
  const user = await prisma.user.create({
    data: { email, passwordHash, name: name ?? null },
    select: { id: true, email: true, name: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
