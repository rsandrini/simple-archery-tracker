'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { NewSessionModal } from '@/components/session/NewSessionModal'

export function HomeClient() {
  const t = useTranslations('HomePage')
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>{t('newSession')}</Button>
      <NewSessionModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
