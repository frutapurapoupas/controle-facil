import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Plus, Camera, RefreshCcw } from 'lucide-react'
import type { AccountCategory, NewAccountInput, Recurrence } from '../types'

const categories: AccountCategory[] = [
  'Mercado',
  'Fatura',
  'Serviços',
  'Moradia',
  'Saúde',
  'Lazer',
  'Outros',
]

const recurrenceOptions: Recurrence[] = ['Nenhuma', 'Semanal', 'Quinzenal', 'Mensal']

interface AccountFormProps {
  onSave: (account: NewAccountInput) => void
}

const initialFormState: Omit<NewAccountInput, 'photo'> = {
  title: '',
  type: 'pagar',
  category: 'Mercado',
  amount: 0,
  dueDate: new Date().toISOString().slice(0, 10),
  recurring: false,
  recurrence: 'Nenhuma',
  recurrenceCount: 1,
  note: '',
}

export function AccountForm({ onSave }: AccountFormProps) {
  const [form, setForm] = useState<Omit<NewAccountInput, 'photo'>>(() => ({ ...initialFormState }))
  const [photo, setPhoto] = useState<string | undefined>()

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    const name = target.name
    const value = target.value
    const type = target.type
    const checked = 'checked' in target ? target.checked : false

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : name === 'amount' ? Number(value) : value,
    }))
  }

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setPhoto(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim() || form.amount <= 0 || !form.dueDate) return

    onSave({
      ...form,
      photo,
    })

    setForm({ ...initialFormState, dueDate: new Date().toISOString().slice(0, 10) })
    setPhoto(undefined)
  }

  return (
    <form className="panel card form-panel" onSubmit={handleSubmit} aria-label="Adicionar conta">
      <div className="section-title">
        <div>
          <p className="label">Nova conta</p>
          <h2>Registrar despesa ou receita</h2>
        </div>
        <div className="icon-box">
          <Plus />
        </div>
      </div>

      <div className="form-group two-column">
        <label>
          Tipo
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="pagar">Pagar</option>
            <option value="receber">Receber</option>
          </select>
        </label>
        <label>
          Categoria
          <select name="category" value={form.category} onChange={handleChange}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-group">
        <label>
          Título
          <input name="title" value={form.title} onChange={handleChange} placeholder="Ex: Conta de energia" />
        </label>
      </div>

      <div className="form-group two-column">
        <label>
          Valor
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount || ''}
            onChange={handleChange}
            placeholder="R$ 0,00"
          />
        </label>
        <label>
          Vencimento
          <input name="dueDate" type="date" value={form.dueDate} onChange={handleChange} />
        </label>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input name="recurring" type="checkbox" checked={form.recurring} onChange={handleChange} />
          <strong>Conta recorrente</strong>
        </label>
        {form.recurring && (
          <div className="recurrence-section">
            <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#475569' }}>Configure a recorrência</p>
            <div className="form-group two-column">
              <label>
                Frequência
                <select name="recurrence" value={form.recurrence} onChange={handleChange} style={{ marginTop: '8px' }}>
                  {recurrenceOptions.map((recurrence) => (
                    <option key={recurrence} value={recurrence}>
                      {recurrence}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantidade de vezes
                <input
                  name="recurrenceCount"
                  type="number"
                  min={1}
                  max={120}
                  value={form.recurrenceCount}
                  onChange={handleChange}
                  placeholder="Digite quantas vezes deseja repetir"
                  style={{ marginTop: '8px' }}
                />
              </label>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '8px 0 0' }}>
              💡 Esta conta será repetida {form.recurrenceCount || 1} vez{(form.recurrenceCount || 1) > 1 ? 'es' : ''} {form.recurrence.toLowerCase()}
            </p>
          </div>
        )}
      </div>

      <div className="form-group">
        <label>
          Observações
          <textarea name="note" value={form.note} onChange={handleChange} placeholder="Detalhes adicionais" rows={3} />
        </label>
      </div>

      <div className="form-group upload-row">
        <label className="upload-input">
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          <Camera />
          <span>Adicionar foto</span>
        </label>
        {photo ? <span className="photo-label">Imagem adicionada</span> : <span className="photo-label disabled">Sem imagem</span>}
      </div>

      <button className="button-primary" type="submit">
        <span>Salvar conta</span>
        <RefreshCcw />
      </button>
    </form>
  )
}
