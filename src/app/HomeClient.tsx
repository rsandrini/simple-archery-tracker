'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { NewSessionModal } from '@/components/session/NewSessionModal'

export function HomeClient() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>+ New session</Button>
      <NewSessionModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
