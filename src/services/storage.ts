import type { AccountItem } from '../types'
import { supabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEY = 'contas-ars:accounts'

function toDbRow(a: AccountItem) {
  return {
    id: a.id,
    title: a.title,
    type: a.type,
    category: a.category,
    amount: a.amount,
    due_date: a.dueDate,
    created_at: a.createdAt,
    paid: a.paid,
    recurring: a.recurring,
    recurrence: a.recurrence,
    recurrence_count: a.recurrenceCount ?? null,
    note: a.note,
    photo: a.photo ?? null,
  }
}

function fromDbRow(r: any): AccountItem {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    category: r.category,
    amount: Number(r.amount) || 0,
    dueDate: r.due_date,
    createdAt: r.created_at,
    paid: Boolean(r.paid),
    recurring: Boolean(r.recurring),
    recurrence: r.recurrence,
    recurrenceCount: r.recurrence_count ?? undefined,
    note: r.note || '',
    photo: r.photo || undefined,
  }
}

export async function loadAccounts(): Promise<AccountItem[]> {
  if (typeof window === 'undefined') return []

  // Try remote first when configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('accounts').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map(fromDbRow)
    } catch (e) {
      // fallback to local
      console.warn('Supabase fetch failed, falling back to localStorage', e)
    }
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as AccountItem[]
  } catch (err) {
    console.error('Failed to read localStorage', err)
    return []
  }
}

export async function saveAccounts(accounts: AccountItem[]) {
  if (typeof window === 'undefined') return

  // Always persist locally for offline
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))

  if (isSupabaseConfigured && supabase) {
    try {
      const rows = accounts.map(toDbRow)
      const { error } = await supabase.from('accounts').upsert(rows, { onConflict: 'id' })
      if (error) throw error
    } catch (e) {
      console.warn('Supabase sync failed', e)
    }
  }
}

// For compatibility with previous synchronous imports, export sync wrappers
export function loadAccountsSync(): AccountItem[] {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored) as AccountItem[]
  } catch {
    return []
  }
}

