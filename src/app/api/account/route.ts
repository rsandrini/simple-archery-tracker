import { NextRequest, NextResponse } from 'next/server'
import { compare, hash } from 'bcryptjs'
import prisma from '@/lib/db/prisma'
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth-utils'
import { validateRegistrationInput } from '@/lib/auth-validation'

export async function PATCH(req: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return unauthorizedResponse()

  const body = await req.json() as {
    type: 'email' | 'password' | 'name' | 'dominantHand'
    currentPassword?: string
    newEmail?: string
    newPassword?: string
    newName?: string
    value?: string | null
  }

  if (!body.type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (body.type === 'name') {
    const name = body.newName?.trim() ?? ''
    if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    if (name.length > 100) return NextResponse.json({ error: 'Name too long' }, { status: 400 })
    await prisma.user.update({ where: { id: userId }, data: { name } })
    return NextResponse.json({ success: true })
  }

  if (body.type === 'dominantHand') {
    const value = body.value ?? null
    if (value !== null && value !== 'right' && value !== 'left') {
      return NextResponse.json({ error: 'dominantHand must be "right", "left", or null' }, { status: 400 })
    }
    await prisma.user.update({ where: { id: userId }, data: { dominantHand: value } })
    return NextResponse.json({ success: true })
  }

  if (!body.currentPassword) {
    return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const valid = await compare(body.currentPassword, user.passwordHash)
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

  if (body.type === 'email') {
    if (!body.newEmail) return NextResponse.json({ error: 'New email is required' }, { status: 400 })
    const emailError = validateRegistrationInput(body.newEmail, 'placeholder12')
    if (emailError?.includes('email')) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    const existing = await prisma.user.findUnique({ where: { email: body.newEmail } })
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }
    await prisma.user.update({ where: { id: userId }, data: { email: body.newEmail } })
    return NextResponse.json({ success: true })
  }

  if (body.type === 'password') {
    if (!body.newPassword) return NextResponse.json({ error: 'New password is required' }, { status: 400 })
    if (body.newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    const passwordHash = await hash(body.newPassword, 12)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
