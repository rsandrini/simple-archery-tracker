import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'
import enMessages from '../../messages/en.json'
import ptBRMessages from '../../messages/pt-BR.json'

const messagesByLocale = {
  en: enMessages,
  'pt-BR': ptBRMessages,
} as const

export default getRequestConfig(async ({ locale }) => {
  const safeLocale = locale && hasLocale(routing.locales, locale) ? locale : routing.defaultLocale

  return {
    locale: safeLocale,
    messages: messagesByLocale[safeLocale],
  }
})
