'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api/client'
import { analytics } from '@/lib/monitoring/posthog-client'
import type { Modality, TargetVariant } from '@/lib/domain/types'

interface Props {
  open: boolean
  onClose: () => void
}

export function NewSessionModal({ open, onClose }: Props) {
  const router = useRouter()
  const [modality, setModality] = useState<Modality>('INDOOR')
  const [targetVariant, setTargetVariant] = useState<TargetVariant>('1-SPOT')
  const [isPending, setIsPending] = useState(false)
  const submitting = useRef(false)

  const handleSubmit = async () => {
    if (submitting.current) return
    submitting.current = true
    setIsPending(true)
    try {
      const variant = modality === 'FLINT' ? '1-SPOT' : targetVariant
      const session = await api.sessions.create(modality, variant) as { id: string }
      analytics.capture('session_created', { modality, targetVariant: variant })
      onClose()
      router.push(`/sessions/${session.id}`)
    } finally {
      submitting.current = false
      setIsPending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Training Session">
      <div className="space-y-5">
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Modality</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['INDOOR', 'FLINT'] as Modality[]).map(m => (
              <label
                key={m}
                className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  modality === m
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <input type="radio" className="sr-only" value={m} checked={modality === m} onChange={() => setModality(m)} />
                <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
                  {m === 'INDOOR' ? 'Indoor Round' : 'Flint Round'}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {m === 'INDOOR' ? '12 ends · 5 arrows' : '7 ends · 4 arrows'}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {modality === 'INDOOR' && (
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target face</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['1-SPOT', '5-SPOT'] as TargetVariant[]).map(v => (
                <label
                  key={v}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    targetVariant === v
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    value={v}
                    checked={targetVariant === v}
                    onChange={() => setTargetVariant(v)}
                  />
                  <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
                    {v === '1-SPOT' ? '1 spot' : '5 spot'}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {v === '1-SPOT' ? 'Single large face' : 'Quincunx layout'}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {modality === 'FLINT' && (
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            Flint target face is auto-selected per end: 1-spot at long distances, 4-spot at 20ft / 20yd / 10yd.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Creating…' : 'Start session'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
