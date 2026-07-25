import { useAccounts } from '../hooks/useAccounts'
import { AccountList } from '../components/AccountList'

export default function Accounts() {
  const { accounts, togglePaid, removeAccount, duplicateRecurring } = useAccounts()

  return (
    <main className="page panel">
      <div className="section-title">
        <div>
          <p className="label">Contas</p>
          <h2>Minhas contas</h2>
        </div>
      </div>

      <AccountList accounts={accounts} onTogglePaid={togglePaid} onRemove={removeAccount} onDuplicateRecurring={duplicateRecurring} />
    </main>
  )
}
