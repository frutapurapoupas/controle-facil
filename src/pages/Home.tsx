import { Link } from 'react-router-dom'
import { CreditCard, FileText, PieChart } from 'lucide-react'
import { AccountForm } from '../components/AccountForm'
import { AccountList } from '../components/AccountList'
import { Dashboard } from '../components/Dashboard'
import { useAccounts } from '../hooks/useAccounts'

export default function Home() {
  const { accounts, summary, addAccount, togglePaid, removeAccount, duplicateRecurring } = useAccounts()
  const totalFlow = summary.totalReceber + summary.totalPagar
  const expensePercent = totalFlow > 0 ? Math.round((summary.totalPagar / totalFlow) * 100) : 50

  return (
    <main className="page">
      <div className="section-title">
        <div>
          <p className="label">Resumo</p>
          <h2>Controle financeiro em um só lugar</h2>
        </div>
      </div>

      <section className="chart-card panel">
        <div className="chart-card-header">
          <div>
            <p className="label">Monitoramento prático</p>
            <h2>Despesas e receitas</h2>
          </div>
          <div className="icon-box chart-icon">
            <PieChart />
          </div>
        </div>

        <div className="chart-body">
          <div
            className="donut-chart"
            style={{
              background: `conic-gradient(#ef4444 0% ${expensePercent}%, #10b981 ${expensePercent}% 100%)`,
            }}
          >
            <div className="donut-hole">
              <span>Saldo</span>
              <strong>{summary.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
            </div>
          </div>

          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-dot income" />
              <div>
                <strong>Receitas</strong>
                <p>{summary.totalReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            </div>
            <div className="legend-item">
              <span className="legend-dot expense" />
              <div>
                <strong>Despesas</strong>
                <p>{summary.totalPagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="chart-actions">
          <Link to="/accounts" className="button-secondary">
            <CreditCard /> Contas
          </Link>
          <Link to="/reports" className="button-secondary">
            <FileText /> Relatórios
          </Link>
          <Link to="/statement" className="button-secondary">
            <PieChart /> Extrato PDF
          </Link>
        </div>
      </section>

      <Dashboard summary={summary} />
      <AccountForm onSave={addAccount} />
      <AccountList accounts={accounts} onTogglePaid={togglePaid} onRemove={removeAccount} onDuplicateRecurring={duplicateRecurring} />
    </main>
  )
}
