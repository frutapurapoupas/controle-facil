import { useMemo, useState } from 'react'
import { useAccounts } from '../hooks/useAccounts'
import { Filter, DollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import type { AccountCategory, AccountType } from '../types'

const categories: AccountCategory[] = [
  'Mercado',
  'Fatura',
  'Serviços',
  'Moradia',
  'Saúde',
  'Lazer',
  'Outros',
]

function monthKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

export default function Reports() {
  const { accounts } = useAccounts()
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  })
  const [selectedCategory, setSelectedCategory] = useState<AccountCategory | 'Todas'>('Todas')
  const [selectedType, setSelectedType] = useState<AccountType | 'Todas'>('Todas' as any)

  const monthItems = useMemo(
    () =>
      accounts.filter((a) => {
        const matchMonth = monthKey(a.dueDate) === month
        const matchCategory = selectedCategory === 'Todas' || a.category === selectedCategory
        const matchType = selectedType === 'Todas' || a.type === selectedType
        return matchMonth && matchCategory && matchType
      }),
    [accounts, month, selectedCategory, selectedType],
  )

  const total = useMemo(() => monthItems.reduce((s, a) => s + (a.type === 'pagar' ? -a.amount : a.amount), 0), [monthItems])
  const totalPagar = useMemo(() => monthItems.filter((a) => a.type === 'pagar').reduce((s, a) => s + a.amount, 0), [monthItems])
  const totalReceber = useMemo(() => monthItems.filter((a) => a.type === 'receber').reduce((s, a) => s + a.amount, 0), [monthItems])

  return (
    <main className="page panel">
      <div className="section-title">
        <div>
          <p className="label">Extrato</p>
          <h2>Extrato mensal com filtros</h2>
        </div>
        <div className="icon-box">
          <Filter />
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>
            Mês
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="filter-input" />
          </label>
        </div>

        <div className="filter-group">
          <label>
            Tipo
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as any)} className="filter-select">
              <option value="Todas">Todos os tipos</option>
              <option value="pagar">A pagar</option>
              <option value="receber">A receber</option>
            </select>
          </label>
        </div>

        <div className="filter-group">
          <label>
            Categoria
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as any)} className="filter-select">
              <option value="Todas">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card balance">
          <div className="stat-icon">
            <DollarSign />
          </div>
          <div>
            <p className="stat-label">Saldo total</p>
            <h3 className="stat-value">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
          </div>
        </div>
        <div className="stat-card expense">
          <div className="stat-icon">
            <TrendingDown />
          </div>
          <div>
            <p className="stat-label">A pagar</p>
            <h3 className="stat-value">-{totalPagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
          </div>
        </div>
        <div className="stat-card income">
          <div className="stat-icon">
            <TrendingUp />
          </div>
          <div>
            <p className="stat-label">A receber</p>
            <h3 className="stat-value">+{totalReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
          </div>
        </div>

        <div className="stat-card expense">
          <div className="stat-icon">
            <TrendingDown />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total a pagar</p>
            <h3 className="stat-value">{totalPagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
          </div>
        </div>

        <div className="stat-card income">
          <div className="stat-icon">
            <TrendingUp />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total a receber</p>
            <h3 className="stat-value">{totalReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Transações ({monthItems.length})</h3>
        {monthItems.length === 0 ? (
          <p className="empty-message">Nenhuma transação encontrada com os filtros aplicados</p>
        ) : (
          <ul className="transaction-list">
            {monthItems.map((t) => (
              <li key={t.id} className={`transaction-row ${t.type}`}>
                <div className="transaction-details">
                  <strong>{t.title}</strong>
                  <div className="muted">
                    {t.category} • {t.dueDate} {t.recurring && '• Recorrente'}
                  </div>
                </div>
                <div className={`transaction-amount ${t.type}`}>{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="print-section">
        <button className="button-primary" onClick={() => window.print()}>
          Imprimir / Salvar como PDF
        </button>
      </div>
    </main>
  )
}
