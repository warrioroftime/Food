import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { PageHead, Loading, Note, Modal } from '../components/ui.jsx';
import { Plus, Pencil } from 'lucide-react';

const ROLES = {
  admin: ['Administrador', 'red'], manager: ['Gerente', 'blue'],
  cashier: ['Caixa', 'yellow'], waiter: ['Garçom', 'green'], kitchen: ['Cozinha', 'gray']
};
const PERMS = {
  admin: 'Acesso total', manager: 'Gestão, relatórios, cadastros',
  cashier: 'PDV, caixa, comandas', waiter: 'Mesas, comandas, garçom mobile', kitchen: 'KDS'
};
const emptyEmployee = { name: '', email: '', password: '', role: 'waiter', commission_pct: 0, active: 1 };

export default function Funcionarios() {
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/employees').then(setList);
  useEffect(() => { load(); }, []);

  async function save() {
    setError('');
    try {
      if (editing.id) await api.put('/employees/' + editing.id, editing);
      else await api.post('/employees', editing);
      setEditing(null); load();
    } catch (e) { setError(e.message); }
  }
  async function toggleActive(u) {
    await api.put('/employees/' + u.id, { active: u.active ? 0 : 1 }); load();
  }

  if (!list) return <Loading />;

  return (
    <>
      <PageHead title="Funcionários" subtitle="Cadastro, perfis de acesso e comissão">
        <button className="btn btn-primary" onClick={() => { setError(''); setEditing({ ...emptyEmployee }); }}>
          <Plus size={18} /> Novo funcionário</button>
      </PageHead>
      <Note>Controle de acesso por perfil (RBAC). Cada funcionário cadastrado acessa o sistema com o próprio e-mail e senha — a base valida o login via JWT.</Note>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Permissões</th><th className="right">Comissão</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 700 }}>{u.name}</td>
                <td className="muted">{u.email}</td>
                <td><span className={'badge ' + (ROLES[u.role]?.[1] || 'gray')}>{ROLES[u.role]?.[0] || u.role}</span></td>
                <td className="muted" style={{ fontSize: 13 }}>{PERMS[u.role] || '—'}</td>
                <td className="right">{u.commission_pct > 0 ? `${u.commission_pct}%` : '—'}</td>
                <td>{u.active ? <span className="badge green">Ativo</span> : <span className="badge gray">Inativo</span>}</td>
                <td className="right">
                  <div className="flex" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-sm" onClick={() => toggleActive(u)}>{u.active ? 'Desativar' : 'Ativar'}</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => { setError(''); setEditing({ ...u, password: '' }); }}><Pencil size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? `Editar · ${editing.name}` : 'Novo funcionário'} onClose={() => setEditing(null)}
          footer={<>
            <button className="btn" onClick={() => setEditing(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={!editing.name || !editing.email || (!editing.id && !editing.password)}>Salvar</button>
          </>}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-row"><label>Nome</label>
            <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} autoFocus /></div>
          <div className="form-row"><label>E-mail (login)</label>
            <input type="email" value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} placeholder="funcionario@empresa.com" /></div>
          <div className="form-row"><label>Senha {editing.id && <span className="muted">(deixe em branco para manter)</span>}</label>
            <input type="text" value={editing.password} onChange={e => setEditing({ ...editing, password: e.target.value })} placeholder={editing.id ? '••••••••' : 'Defina uma senha de acesso'} /></div>
          <div className="grid cols-2">
            <div className="form-row"><label>Perfil</label>
              <select value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })}>
                {Object.keys(ROLES).map(k => <option key={k} value={k}>{ROLES[k][0]}</option>)}
              </select></div>
            <div className="form-row"><label>Comissão (%)</label>
              <input type="number" step="0.5" value={editing.commission_pct} onChange={e => setEditing({ ...editing, commission_pct: Number(e.target.value) })} /></div>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>{PERMS[editing.role]}</div>
        </Modal>
      )}
    </>
  );
}
