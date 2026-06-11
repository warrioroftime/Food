import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { auth, api } from './api.js';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PDV from './pages/PDV.jsx';
import Mesas from './pages/Mesas.jsx';
import Comandas from './pages/Comandas.jsx';
import Cozinha from './pages/Cozinha.jsx';
import Delivery from './pages/Delivery.jsx';
import Produtos from './pages/Produtos.jsx';
import Estoque from './pages/Estoque.jsx';
import Clientes from './pages/Clientes.jsx';
import Financeiro from './pages/Financeiro.jsx';
import Relatorios from './pages/Relatorios.jsx';
import Funcionarios from './pages/Funcionarios.jsx';
import Configuracoes from './pages/Configuracoes.jsx';
import SaaSAdmin from './pages/SaaSAdmin.jsx';

export default function App() {
  const [user, setUser] = useState(auth.user);

  // Sessões antigas podem não ter company_id salvo — atualiza a partir do token
  useEffect(() => {
    if (auth.token && user && user.company_id == null) {
      api.get('/auth/me').then(me => {
        const merged = { ...user, company_id: me.company_id, role: me.role };
        auth.set(auth.token, merged); setUser(merged);
      }).catch(() => {});
    }
  }, []);

  if (!user) return <Login onLogin={(u) => setUser(u)} />;

  const isSaasOwner = user.company_id === 1;

  return (
    <Routes>
      <Route element={<Layout user={user} onLogout={() => { auth.clear(); setUser(null); }} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pdv" element={<PDV />} />
        <Route path="/mesas" element={<Mesas />} />
        <Route path="/comandas" element={<Comandas />} />
        <Route path="/cozinha" element={<Cozinha />} />
        <Route path="/delivery" element={<Delivery />} />
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/funcionarios" element={<Funcionarios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        {isSaasOwner && <Route path="/saas" element={<SaaSAdmin />} />}
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
