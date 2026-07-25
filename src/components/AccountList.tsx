import { isPast, parseISO } from 'date-fns'
import { ArrowDownRight, ArrowUpRight, Trash2, Repeat, Calendar } from 'lucide-react'
import type { AccountItem } from '../types'

interface AccountListProps {
  accounts: AccountItem[]
  onTogglePaid: (id: string) => void
  onRemove: (id: string) => void
  onDuplicateRecurring: (id: string) => void
}

export function AccountList({ accounts, onTogglePaid, onRemove, onDuplicateRecurring }: AccountListProps) {
  if (accounts.length === 0) {
    return (
      <div className="panel empty-state">
        <h3>Nenhuma conta encontrada</h3>
        <p>Adicione sua primeira conta para começar a controlar despesas, receitas e recorrências.</p>
      </div>
    )
  }

  return (
    <div className="panel account-list">
      {accounts.map((account) => {
        const overdue = !account.paid && isPast(parseISO(account.dueDate))
        return (
          <article key={account.id} className={`account-card ${account.paid ? 'paid' : ''} ${overdue ? 'overdue' : ''}`}>
            <div className="account-main">
              <div className="account-meta">
                <span className={`badge ${account.type}`}>{account.type === 'pagar' ? 'A pagar' : 'A receber'}</span>
                <span className="category-label">{account.category}</span>
              </div>
              <h3>{account.title}</h3>
              <p>{account.note || 'Sem observações'}</p>
            </div>

            <div className="account-details">
              <div className="amount-row">
                <span>{account.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span className="due-date">
                  <Calendar /> {account.dueDate}
                </span>
              </div>
              <div className="status-row">
                <span className={`status-pill ${account.paid ? 'paid-pill' : overdue ? 'overdue-pill' : 'open-pill'}`}>
                  {account.paid ? 'Pago' : overdue ? 'Vencida' : 'Aberta'}
                </span>
                {account.recurring && <span className="status-pill recurring-pill">Recorrente</span>}
              </div>

              {account.photo && (
                <img className="receipt-image" src={account.photo} alt={`Foto da conta ${account.title}`} />
              )}

              <div className="account-actions">
                <button type="button" className="action-button" onClick={() => onTogglePaid(account.id)}>
                  {account.paid ? <ArrowUpRight /> : <ArrowDownRight />}
                  {account.paid ? 'Marcar aberto' : 'Marcar pago'}
                </button>
                <button type="button" className="action-button danger" onClick={() => onRemove(account.id)}>
                  <Trash2 /> Remover
                </button>
                {account.recurring && (
                  <button type="button" className="action-button secondary" onClick={() => onDuplicateRecurring(account.id)}>
                    <Repeat /> Nova recorrência
                  </button>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
