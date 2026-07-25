import type { AccountCategory } from '../types'

interface CategoryBreakdownProps {
  categoryTotals: Record<AccountCategory, number>
}

const categoryLabels: Record<AccountCategory, string> = {
  Mercado: 'Mercado',
  Fatura: 'Fatura',
  Serviços: 'Serviços',
  Moradia: 'Moradia',
  Saúde: 'Saúde',
  Lazer: 'Lazer',
  Outros: 'Outros',
}

export function CategoryBreakdown({ categoryTotals }: CategoryBreakdownProps) {
  const categories = Object.entries(categoryTotals)
    .map(([category, total]) => ({ category: category as AccountCategory, total }))
    .sort((a, b) => b.total - a.total)

  return (
    <section className="panel category-breakdown" aria-label="Resumo por categoria">
      <div className="section-title">
        <div>
          <p className="label">Categorias</p>
          <h2>Despesas por categoria</h2>
        </div>
      </div>
      <div className="category-grid">
        {categories.map((item) => (
          <div key={item.category} className="category-card">
            <span>{categoryLabels[item.category]}</span>
            <strong>{item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}
