export type AccountType = 'pagar' | 'receber'
export type Recurrence = 'Nenhuma' | 'Semanal' | 'Quinzenal' | 'Mensal'
export type AccountCategory = 'Mercado' | 'Fatura' | 'Serviços' | 'Moradia' | 'Saúde' | 'Lazer' | 'Outros'

export interface AccountItem {
  id: string
  title: string
  type: AccountType
  category: AccountCategory
  amount: number
  dueDate: string
  createdAt: string
  paid: boolean
  recurring: boolean
  recurrence: Recurrence
  recurrenceCount?: number
  note: string
  photo?: string
}

export interface AccountSummary {
  totalPagar: number
  totalReceber: number
  balance: number
  overdue: number
  openCount: number
  nextDue: string | null
  categoryTotals: Record<AccountCategory, number>
}

export type NewAccountInput = Omit<AccountItem, 'id' | 'createdAt' | 'paid'>
