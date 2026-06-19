import { NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import nodemailer from 'nodemailer'
import prisma from '@/lib/db/prisma'

const EXPIRY_MS = 60 * 60 * 1000 // 1 hour

// Rate limiting: max 3 reset requests per email per 10 minutes
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 3
const rateMap = new Map<string, number>()

function isRateLimited(email: string): boolean {
  const key = email.toLowerCase()
  const count = rateMap.get(key) ?? 0
  if (count >= RATE_MAX) return true
  rateMap.set(key, count + 1)
  setTimeout(() => rateMap.delete(key), RATE_WINDOW_MS)
  return false
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

async function sendResetEmail(to: string, resetLink: string, name?: string | null) {
  const safeName = name ? escapeHtml(name) : null
  await transporter.sendMail({
    from: `Quiver <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset your Quiver password',
    html: `
      <p>Hi${safeName ? ` ${safeName}` : ''},</p>
      <p>Click the link below to reset your password. It expires in 1 hour.</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  })
}

export async function POST(req: Request) {
  const { email } = await req.json()

  // Always return 200 — never reveal whether the email exists
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ ok: true })
  }

  if (isRateLimited(email)) return NextResponse.json({ ok: true })

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) return NextResponse.json({ ok: true })

  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + EXPIRY_MS)

  // Invalidate any existing token for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } })

  const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000'
  const resetLink = `${baseUrl}/reset-password?token=${rawToken}`

  await sendResetEmail(email, resetLink, user.name)

  return NextResponse.json({ ok: true })
}
