'use client'

import { useTheme } from '@/lib/context/ThemeContext'
import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getTargetDef } from '@/lib/domain/target'
import { TargetRings } from '@/components/target/TargetRings'

const PREVIEW_TARGET = getTargetDef('INDOOR', '1-SPOT')
// Sample arrows — viewBox 80 80 40 40 (shows X ring r=8 and 5 ring r=15, blue 4-ring fills the edges)
const PREVIEW_ARROWS = [
  { x: 97,  y: 97,  label: 'X', color: '#e74c3c' },  // X ring (dist ≈ 4.2 from center)
  { x: 109, y: 103, label: '5', color: '#e67e22' },  // 5 ring (dist ≈ 9.5 from center)
] as const

interface Props {
  user: { email: string; name: string; dominantHand: string | null }
}

type Msg = { type: 'ok' | 'err'; text: string }

export default function SettingsClient({ user }: Props) {
  const { theme, toggle } = useTheme()

  const [nameForm, setNameForm] = useState({ newName: user.name })
  const [nameMsg, setNameMsg] = useState<Msg | null>(null)
  const [nameLoading, setNameLoading] = useState(false)

  const [emailForm, setEmailForm] = useState({ currentPassword: '', newEmail: '' })
  const [emailMsg, setEmailMsg] = useState<Msg | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwMsg, setPwMsg] = useState<Msg | null>(null)
  const [pwLoading, setPwLoading] = useState(false)

  const [hand, setHand] = useState<string | null>(user.dominantHand)
  const [handMsg, setHandMsg] = useState<Msg | null>(null)
  const [showArrowPreview, setShowArrowPreview] = useState(false)

  const [arrowScale, setArrowScale] = useState<number>(1)

  useEffect(() => {
    const saved = localStorage.getItem('arquearia:arrowScale')
    const parsed = saved ? parseFloat(saved) : 1
    setArrowScale(isNaN(parsed) ? 1 : Math.min(1, Math.max(0.5, parsed)))
  }, [])

  function handleArrowScaleChange(value: number) {
    setArrowScale(value)
    localStorage.setItem('arquearia:arrowScale', String(value))
  }

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNameMsg(null)
    setNameLoading(true)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'name', newName: nameForm.newName }),
      })
      const data = await res.json()
      if (res.ok) {
        setNameMsg({ type: 'ok', text: 'Name updated.' })
      } else {
        setNameMsg({ type: 'err', text: data.error ?? 'Failed to update name' })
      }
    } finally {
      setNameLoading(false)
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailMsg(null)
    setEmailLoading(true)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', currentPassword: emailForm.currentPassword, newEmail: emailForm.newEmail }),
      })
      const data = await res.json()
      if (res.ok) {
        setEmailMsg({ type: 'ok', text: 'Email updated. Signing you out…' })
        setEmailForm({ currentPassword: '', newEmail: '' })
        setTimeout(() => signOut({ callbackUrl: '/login' }), 1500)
      } else {
        setEmailMsg({ type: 'err', text: data.error ?? 'Failed to update email' })
      }
    } finally {
      setEmailLoading(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'err', text: 'New passwords do not match' })
      return
    }
    setPwLoading(true)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setPwMsg({ type: 'ok', text: 'Password updated successfully.' })
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setPwMsg({ type: 'err', text: data.error ?? 'Failed to update password' })
      }
    } finally {
      setPwLoading(false)
    }
  }

  async function handleHandChange(value: 'right' | 'left') {
    const next = hand === value ? null : value
    setHand(next)
    setHandMsg(null)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'dominantHand', value: next }),
      })
      if (res.ok) {
        setHandMsg({ type: 'ok', text: 'Saved.' })
      } else {
        const data = await res.json()
        setHandMsg({ type: 'err', text: data.error ?? 'Failed to save' })
      }
    } catch {
      setHandMsg({ type: 'err', text: 'Network error' })
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'

  const sectionHeading =
    'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'

  return (
    <main className="max-w-lg mx-auto px-4 py-8 space-y-10">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">
          ←
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
      </div>

      {/* Archer Profile */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Archer Profile</h2>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Dominant hand</p>
          <div className="flex gap-2">
            {(['right', 'left'] as const).map(h => (
              <button
                key={h}
                onClick={() => handleHandChange(h)}
                className={`flex-1 py-3 text-sm font-medium rounded-lg border transition-colors capitalize
                  ${hand === h
                    ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500'
                    : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                {h === 'right' ? 'Right-handed' : 'Left-handed'}
              </button>
            ))}
          </div>
          {handMsg && (
            <p className={`mt-2 text-xs ${handMsg.type === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {handMsg.text}
            </p>
          )}
        </div>
      </section>

      {/* Appearance */}
      <section className="space-y-3">
        <h2 className={sectionHeading}>Appearance</h2>
        <div className="flex gap-3">
          <button
            onClick={() => { if (theme !== 'light') toggle() }}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              theme === 'light'
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            ☀ Light
          </button>
          <button
            onClick={() => { if (theme !== 'dark') toggle() }}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            ☾ Dark
          </button>
        </div>
      </section>

      {/* Targeting */}
      <section className="space-y-3">
        <h2 className={sectionHeading}>Targeting</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-300">Arrow dot size</p>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {Math.round(arrowScale * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={100}
            step={5}
            value={Math.round(arrowScale * 100)}
            onChange={e => handleArrowScaleChange(Number(e.target.value) / 100)}
            onFocus={() => setShowArrowPreview(true)}
            onBlur={() => setShowArrowPreview(false)}
            onMouseDown={() => setShowArrowPreview(true)}
            onMouseUp={() => setShowArrowPreview(false)}
            onTouchStart={() => setShowArrowPreview(true)}
            onTouchEnd={() => setShowArrowPreview(false)}
            className="w-full h-1 accent-blue-500 cursor-pointer"
            aria-label="Arrow dot size"
          />
          {showArrowPreview && (
            <svg
              viewBox="72 72 56 56"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
            >
              {PREVIEW_TARGET.spots.map(spot => (
                <TargetRings
                  key={spot.index}
                  spot={spot}
                  rings={PREVIEW_TARGET.rings}
                  background={PREVIEW_TARGET.background}
                />
              ))}
              {PREVIEW_ARROWS.map((a, i) => {
                const r = PREVIEW_TARGET.arrowRadius * arrowScale * 0.5
                return (
                  <g key={i}>
                    <circle cx={a.x} cy={a.y} r={r} fill={a.color} />
                    <text
                      x={a.x} y={a.y}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={Math.max(r, 4)} fontWeight="bold"
                      fill="white" stroke="rgba(0,0,0,0.4)" strokeWidth={0.4} paintOrder="stroke"
                      style={{ userSelect: 'none' }}
                    >{a.label}</text>
                  </g>
                )
              })}
            </svg>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Smaller dots make groupings easier to read.
          </p>
        </div>
      </section>

      {/* Change name */}
      <section className="space-y-3">
        <h2 className={sectionHeading}>Display Name</h2>
        <form onSubmit={handleNameSubmit} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Your name"
            value={nameForm.newName}
            onChange={e => setNameForm({ newName: e.target.value })}
            className={inputClass}
          />
          {nameMsg && (
            <p className={`text-sm ${nameMsg.type === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {nameMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={nameLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {nameLoading ? 'Updating…' : 'Update name'}
          </button>
        </form>
      </section>

      {/* Change email */}
      <section className="space-y-3">
        <h2 className={sectionHeading}>Change Email</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Current: <span className="text-gray-700 dark:text-gray-300">{user.email}</span>
        </p>
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="New email address"
            value={emailForm.newEmail}
            onChange={e => setEmailForm(f => ({ ...f, newEmail: e.target.value }))}
            className={inputClass}
          />
          <input
            type="password"
            required
            placeholder="Current password to confirm"
            value={emailForm.currentPassword}
            onChange={e => setEmailForm(f => ({ ...f, currentPassword: e.target.value }))}
            className={inputClass}
          />
          {emailMsg && (
            <p className={`text-sm ${emailMsg.type === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {emailMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={emailLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {emailLoading ? 'Updating…' : 'Update email'}
          </button>
        </form>
      </section>

      {/* Change password */}
      <section className="space-y-3">
        <h2 className={sectionHeading}>Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <input
            type="password"
            required
            placeholder="Current password"
            value={pwForm.currentPassword}
            onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
            className={inputClass}
          />
          <input
            type="password"
            required
            placeholder="New password (min. 8 characters)"
            value={pwForm.newPassword}
            onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
            className={inputClass}
          />
          <input
            type="password"
            required
            placeholder="Confirm new password"
            value={pwForm.confirmPassword}
            onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
            className={inputClass}
          />
          {pwMsg && (
            <p className={`text-sm ${pwMsg.type === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {pwMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={pwLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {pwLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>

      {/* Account / sign out */}
      <section className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-8">
        <h2 className={sectionHeading}>Account</h2>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="rounded-lg border border-red-300 dark:border-red-800 px-4 py-2 text-sm text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Sign out
        </button>
      </section>
    </main>
  )
}
