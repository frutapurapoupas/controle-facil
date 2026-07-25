import { useEffect, useMemo, useState } from 'react'
import { addMonths, addWeeks, isPast, parseISO } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import type { AccountCategory, AccountItem, AccountSummary, Recurrence, NewAccountInput } from '../types'
import { loadAccounts, saveAccounts } from '../services/storage'

const defaultCategories: AccountCategory[] = [
  'Mercado',
  'Fatura',
  'Serviços',
  'Moradia',
  'Saúde',
  'Lazer',
  'Outros',
]

const recurrenceSteps: Record<Exclude<Recurrence, 'Nenhuma'>, (date: Date) => Date> = {
  Semanal: (date) => addWeeks(date, 1),
  Quinzenal: (date) => addWeeks(date, 2),
  Mensal: (date) => addMonths(date, 1),
}

function nextRecurrenceDate(dueDate: string, recurrence: Recurrence): string {
  if (recurrence === 'Nenhuma') return dueDate
  const nextDate = recurrenceSteps[recurrence](parseISO(dueDate))
  return nextDate.toISOString().slice(0, 10)
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountItem[]>([])

  // initial load (from supabase or local)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const items = await loadAccounts()
      if (mounted) setAccounts(items)
    })()
    return () => {
      mounted = false
    }
  }, [])

  // persist changes
  useEffect(() => {
    ;(async () => {
      try {
        await saveAccounts(accounts)
      } catch (e) {
        console.warn('Failed to persist accounts', e)
      }
    })()
  }, [accounts])

  const summary = useMemo<AccountSummary>(() => {
    const categoryTotals = defaultCategories.reduce<Record<AccountCategory, number>>(
      (acc, item) => ({ ...acc, [item]: 0 }),
      {} as Record<AccountCategory, number>,
    )

    let totalPagar = 0
    let totalReceber = 0
    let overdue = 0

    accounts.forEach((account) => {
      if (account.type === 'pagar') {
        totalPagar += account.amount
      } else {
        totalReceber += account.amount
      }

      if (!account.paid && isPast(parseISO(account.dueDate))) {
        overdue += 1
      }

      categoryTotals[account.category] = (categoryTotals[account.category] || 0) + account.amount
    })

    const nextDueItem = accounts
      .filter((account) => !account.paid)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]

    return {
      totalPagar,
      totalReceber,
      balance: totalReceber - totalPagar,
      overdue,
      openCount: accounts.filter((account) => !account.paid).length,
      nextDue: nextDueItem?.dueDate ?? null,
      categoryTotals,
    }
  }, [accounts])

  const addAccount = (account: NewAccountInput) => {
    setAccounts((current) => [
      {
        ...account,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        paid: false,
      },
      ...current,
    ])
  }

  const updateAccount = (updated: AccountItem) => {
    setAccounts((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  const removeAccount = (id: string) => {
    setAccounts((current) => current.filter((account) => account.id !== id))
  }

  const togglePaid = (id: string) => {
    setAccounts((current) =>
      current.map((account) =>
        account.id === id
          ? {
              ...account,
              paid: !account.paid,
            }
          : account,
      ),
    )
  }

  const duplicateRecurring = (id: string) => {
    const source = accounts.find((account) => account.id === id)
    if (!source || source.recurrence === 'Nenhuma') return

    // If recurrenceCount is provided, only create next if count > 1
    if (typeof source.recurrenceCount === 'number' && source.recurrenceCount <= 1) return

    const nextDue = nextRecurrenceDate(source.dueDate, source.recurrence)
    const duplicate: AccountItem = {
      ...source,
      id: uuidv4(),
      dueDate: nextDue,
      createdAt: new Date().toISOString(),
      paid: false,
      recurrenceCount: typeof source.recurrenceCount === 'number' ? source.recurrenceCount - 1 : undefined,
    }

    // Update source to decrement its remaining count as well (if applies)
    setAccounts((current) =>
      current.map((acct) => (acct.id === source.id && typeof acct.recurrenceCount === 'number' ? { ...acct, recurrenceCount: acct.recurrenceCount - 1 } : acct)),
    )

    setAccounts((current) => [duplicate, ...current])
  }

  return {
    accounts,
    summary,
    addAccount,
    updateAccount,
    removeAccount,
    togglePaid,
    duplicateRecurring,
    defaultCategories,
  }
}
