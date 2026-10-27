import { auth, signOut } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { LocaleSwitcher } from './LocaleSwitcher'

interface Props {
  locale: string
}

export default async function UserHeader({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'UserHeader' })
  const session = await auth()
  if (!session?.user) return null

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
        {session.user.name ?? session.user.email}
      </span>
      <div className="flex items-center gap-3">
        <LocaleSwitcher />
        <Link
          href="/settings"
          locale={locale}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 min-w-[40px] min-h-[40px] flex items-center"
          title={t('settings')}
        >
          ⚙
        </Link>
        <form
          action={async () => {
            'use server'
            await signOut({ redirectTo: `/${locale}/login` })
          }}
        >
          <button
            type="submit"
            className="text-sm text-red-600 dark:text-red-400 hover:underline min-w-[40px] min-h-[40px] flex items-center"
          >
            {t('signOut')}
          </button>
        </form>
      </div>
    </header>
  )
}
