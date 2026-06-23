import Dexie, { type EntityTable } from 'dexie'

export interface LocalSession {
  id: string
  modality: string
  targetVariant: string
  createdAt: string
  notes: string | null
  rating: number | null
  updatedAt: string
  _syncStatus: 'synced' | 'pending'
}

export interface LocalEnd {
  id: string
  sessionId: string
  index: number
  _syncStatus: 'synced' | 'pending'
}

export interface LocalArrow {
  id: string
  endId: string
  sessionId: string
  index: number
  score: string
  points: number
  isX: boolean
  x: number
  y: number
  distance: string | null
  spotIndex: number | null
  updatedAt: string
  _syncStatus: 'synced' | 'pending'
}

export interface QueuedMutation {
  id?: number
  method: 'POST' | 'PATCH' | 'DELETE'
  url: string
  body: string | null
  createdAt: string
  retries: number
}

class QuiverDB extends Dexie {
  sessions!: EntityTable<LocalSession, 'id'>
  ends!: EntityTable<LocalEnd, 'id'>
  arrows!: EntityTable<LocalArrow, 'id'>
  mutations!: EntityTable<QueuedMutation, 'id'>

  constructor() {
    super('quiver')
    this.version(1).stores({
      sessions: 'id, modality, createdAt, _syncStatus',
      ends: 'id, sessionId, index, _syncStatus',
      arrows: 'id, endId, sessionId, _syncStatus',
      mutations: '++id, createdAt',
    })
  }
}

// Singleton — safe to import anywhere on the client
const db = new QuiverDB()
export default db
