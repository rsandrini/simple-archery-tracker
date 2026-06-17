import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'

// NOTE: Session.user.id is augmented in src/types/next-auth.d.ts — no duplicate declare module here.
// NOTE: prisma import is deferred to authorize() to avoid bundling Node.js modules in Edge Runtime middleware

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Lazy import prisma only when needed (server-side context)
        const prisma = (await import('@/lib/db/prisma')).default

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user) return null
        const valid = await compare(credentials.password as string, user.passwordHash)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name ?? undefined }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
})
