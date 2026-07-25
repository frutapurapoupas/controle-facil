import './App.css'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Accounts from './pages/Accounts'
import Reports from './pages/Reports'
import Statement from './pages/Statement'
import NavBar from './components/NavBar'

function App() {
  return (
    <div className="app-root">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/statement" element={<Statement />} />
      </Routes>
      <NavBar />
    </div>
  )
}

export default App
