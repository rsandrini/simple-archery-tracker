import { auth, signOut } from '@/lib/auth'

export default async function UserHeader() {
  const session = await auth()
  if (!session?.user) return null

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
        {session.user.name ?? session.user.email}
      </span>
      <form
        action={async () => {
          'use server'
          await signOut({ redirectTo: '/login' })
        }}
      >
        <button
          type="submit"
          className="text-sm text-red-600 dark:text-red-400 hover:underline min-w-[40px] min-h-[40px] flex items-center"
        >
          Sign out
        </button>
      </form>
    </header>
  )
}
