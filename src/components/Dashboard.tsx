import { Wallet, CalendarDays, Bell, Layers } from 'lucide-react'
import type { AccountSummary } from '../types'

interface DashboardProps {
  summary: AccountSummary
}

export function Dashboard({ summary }: DashboardProps) {
  return (
    <section className="dashboard-grid" aria-label="Resumo financeiro">
      <div className="summary-card balance-card">
        <div className="summary-icon">
          <Wallet />
        </div>
        <div>
          <p className="summary-label">Saldo disponível</p>
          <h2>{summary.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h2>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon">
          <CalendarDays />
        </div>
        <div>
          <p className="summary-label">Próxima vencida</p>
          <h2>{summary.nextDue ?? 'Sem contas'}</h2>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon">
          <Bell />
        </div>
        <div>
          <p className="summary-label">Contas vencidas</p>
          <h2>{summary.overdue}</h2>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon">
          <Layers />
        </div>
        <div>
          <p className="summary-label">Contas em aberto</p>
          <h2>{summary.openCount}</h2>
        </div>
      </div>
    </section>
  )
}
