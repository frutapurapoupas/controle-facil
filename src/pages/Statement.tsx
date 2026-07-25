import { useMemo, useState } from 'react'
import { Download, Filter, Wallet, TrendingDown, TrendingUp } from 'lucide-react'
import { useAccounts } from '../hooks/useAccounts'
import type { AccountCategory, AccountType } from '../types'

const categories: AccountCategory[] = ['Mercado', 'Fatura', 'Serviços', 'Moradia', 'Saúde', 'Lazer', 'Outros']

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10)
}

function monthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10)
}

export default function Statement() {
  const { accounts } = useAccounts()
  const [fromDate, setFromDate] = useState(() => monthStart(new Date()))
  const [toDate, setToDate] = useState(() => monthEnd(new Date()))
  const [selectedType, setSelectedType] = useState<AccountType | 'Todas'>('Todas')
  const [selectedCategory, setSelectedCategory] = useState<AccountCategory | 'Todas'>('Todas')

  const filteredAccounts = useMemo(
    () =>
      accounts.filter((item) => {
        const date = item.dueDate
        const rangeMatch = date >= fromDate && date <= toDate
        const typeMatch = selectedType === 'Todas' || item.type === selectedType
        const categoryMatch = selectedCategory === 'Todas' || item.category === selectedCategory
        return rangeMatch && typeMatch && categoryMatch
      }),
    [accounts, fromDate, toDate, selectedType, selectedCategory],
  )

  const totalBalance = useMemo(
    () => filteredAccounts.reduce((sum, item) => sum + (item.type === 'receber' ? item.amount : -item.amount), 0),
    [filteredAccounts],
  )

  const totalReceived = useMemo(
    () => filteredAccounts.filter((item) => item.type === 'receber').reduce((sum, item) => sum + item.amount, 0),
    [filteredAccounts],
  )

  const totalPaid = useMemo(
    () => filteredAccounts.filter((item) => item.type === 'pagar').reduce((sum, item) => sum + item.amount, 0),
    [filteredAccounts],
  )

  return (
    <main className="page statement-page">
      <section className="topbar statement-hero">
        <p className="eyebrow">Extrato inteligente</p>
        <h1>Filtro personalizado e exportação em PDF</h1>
        <p className="hero-text">Escolha o período, tipo e categoria para gerar um extrato objetivo e salve em PDF com um único toque.</p>
      </section>

      <section className="panel statement-panel">
        <div className="statement-header">
          <div>
            <p className="label">Extrato</p>
            <h2>Extrato por filtro</h2>
          </div>
          <button className="button-secondary" type="button" onClick={() => window.print()}>
            <Download /> Salvar como PDF
          </button>
        </div>

        <div className="filters-section">
          <label>
            Período de
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="filter-input" />
          </label>
          <label>
            Período até
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="filter-input" />
          </label>
          <label>
            Tipo
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as any)} className="filter-select">
              <option value="Todas">Todos os tipos</option>
              <option value="pagar">Despesas</option>
              <option value="receber">Receitas</option>
            </select>
          </label>
          <label>
            Categoria
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as any)} className="filter-select">
              <option value="Todas">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="stats-grid statement-stats">
          <div className="stat-card balance">
            <div className="stat-icon">
              <Wallet />
            </div>
            <div>
              <p className="stat-label">Saldo filtrado</p>
              <h3 className="stat-value">{totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
            </div>
          </div>
          <div className="stat-card income">
            <div className="stat-icon">
              <TrendingUp />
            </div>
            <div>
              <p className="stat-label">Receitas</p>
              <h3 className="stat-value">{totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
            </div>
          </div>
          <div className="stat-card expense">
            <div className="stat-icon">
              <TrendingDown />
            </div>
            <div>
              <p className="stat-label">Despesas</p>
              <h3 className="stat-value">{totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
            </div>
          </div>
        </div>

        <div className="section-title statement-list-header">
          <div>
            <p className="label">Transações</p>
            <h2>{filteredAccounts.length} resultados</h2>
          </div>
          <div className="icon-box">
            <Filter />
          </div>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="panel empty-state">
            <h3>Nenhuma transação encontrada</h3>
            <p>Altere os filtros para gerar um extrato com dados disponíveis.</p>
          </div>
        ) : (
          <ul className="transaction-list statement-list">
            {filteredAccounts.map((transaction) => (
              <li key={transaction.id} className={`transaction-row ${transaction.type}`}>
                <div>
                  <strong>{transaction.title}</strong>
                  <div className="muted">{transaction.category} • {formatDate(transaction.dueDate)}</div>
                </div>
                <div className={`transaction-amount ${transaction.type}`}>
                  {transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
