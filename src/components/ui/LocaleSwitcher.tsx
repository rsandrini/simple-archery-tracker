'use client'

import { useLocale } from 'next-intl'
import { usePathname, Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

export function LocaleSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-200/50 dark:bg-gray-700/50 p-1">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
            locale === l
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {l === 'pt-BR' ? 'PT' : l.toUpperCase()}
        </Link>
      ))}
    </div>
  )
}
