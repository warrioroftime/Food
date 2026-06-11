import { api, auth } from '../api.js';
import SaaSAdmin from './SaaSAdmin.jsx';
import { Building2, LogOut } from 'lucide-react';

// Shell isolado do dono da plataforma: mostra SOMENTE o painel SaaS.
// Para usar o sistema operacional, ele "entra" num cliente a partir daqui.
export default function SaaSConsole({ user, onEnter, onLogout }) {
  async function enter(company) {
    const { token, user: u } = await api.post('/saas/enter/' + company.id);
    auth.set(token, u);
    onEnter(u);
  }

  return (
    <div className="saas-console">
      <header className="topbar saas-topbar">
        <div className="brand" style={{ padding: 0 }}>
          <span className="logo"><Building2 size={19} color="#fff" /></span>
          FoodDanilo · Painel SaaS
        </div>
        <div className="spacer" />
        <div className="user">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{user.name}</div>
            <div className="muted" style={{ fontSize: 11 }}>Administrador da plataforma</div>
          </div>
          <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
          <button className="btn btn-sm btn-ghost" onClick={onLogout} title="Sair">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>
      <main className="content">
        <SaaSAdmin onEnter={enter} />
      </main>
    </div>
  );
}
