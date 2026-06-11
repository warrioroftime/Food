import { useEffect, useState } from 'react';
import { api, brl } from '../api.js';
import { PageHead, Modal, Loading, Note } from '../components/ui.jsx';
import { Building2, Users, Grid3x3, DollarSign, Plus, Pencil, Check, Search, LogIn, KeyRound, X } from 'lucide-react';

const PLANS = { basic: ['Básico', 'gray'], pro: ['Pro', 'blue'], enterprise: ['Enterprise', 'yellow'] };
const STATUS = { active: ['Ativa', 'green'], trial: ['Trial', 'yellow'], suspended: ['Suspensa', 'red'] };
const ROLE_LABELS = { admin: 'Administrador', manager: 'Gerente', cashier: 'Caixa', waiter: 'Garçom', kitchen: 'Cozinha' };
const ROLE_KEYS = Object.keys(ROLE_LABELS);
const PRESETS = {
  basic: { max_users: 5, max_tables: 12, max_orders: 20, monthly_fee: 99.90 },
  pro: { max_users: 15, max_tables: 30, max_orders: 60, monthly_fee: 199.90 },
  enterprise: { max_users: 50, max_tables: 80, max_orders: 200, monthly_fee: 499.90 },
};
const emptyCompany = {
  name: '', document: '', plan: 'pro', status: 'trial', ...PRESETS.pro,
  cep: '', logradouro: '', numero: '', bairro: '', municipio: '', uf: '', phone: '', email: '',
  admin_name: '', admin_email: '', admin_password: ''
};

export default function SaaSAdmin({ onEnter }) {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [usersOf, setUsersOf] = useState(null);
  const [error, setError] = useState('');
  const [cnpjInfo, setCnpjInfo] = useState(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);

  const load = () => api.get('/saas/companies').then(setData);
  useEffect(() => { load(); }, []);

  function applyPlan(form, plan) { return { ...form, plan, ...PRESETS[plan] }; }

  async function save() {
    setError('');
    try {
      if (editing.id) await api.put('/saas/companies/' + editing.id, editing);
      else await api.post('/saas/companies', editing);
      setEditing(null); load();
    } catch (e) { setError(e.message); }
  }
  async function setStatus(c, status) { await api.put('/saas/companies/' + c.id, { status }); load(); }

  async function lookupCnpj() {
    const digits = String(editing.document || '').replace(/\D/g, '');
    if (digits.length !== 14) { setError('Informe um CNPJ com 14 dígitos.'); return; }
    setError(''); setCnpjInfo(null); setCnpjLoading(true);
    try {
      const info = await api.get('/cnpj/' + digits);
      setCnpjInfo(info);
      setEditing(e => ({
        ...e,
        document: info.document,
        name: e.name || info.name,
        cep: info.cep || e.cep,
        logradouro: info.logradouro || e.logradouro,
        numero: info.numero || e.numero,
        bairro: info.bairro || e.bairro,
        municipio: info.municipio || e.municipio,
        uf: info.uf || e.uf,
        phone: info.phone || e.phone,
        email: info.email || e.email,
      }));
    } catch (err) { setError(err.message); }
    finally { setCnpjLoading(false); }
  }

  function openForm(company) {
    setError(''); setCnpjInfo(null);
    setEditing(company);
  }

  if (!data) return <Loading />;
  // A empresa-plataforma (id 1) não é um cliente — não aparece na lista nem nos totais.
  const clients = data.companies.filter(c => c.id !== 1);
  const active = clients.filter(c => c.status === 'active').length;

  return (
    <>
      <PageHead title="Administração SaaS" subtitle="Multiempresa — cadastre e configure os clientes, planos e cobrança">
        <button className="btn btn-primary" onClick={() => openForm({ ...emptyCompany })}>
          <Plus size={18} /> Nova empresa</button>
      </PageHead>
      <Note>Cada empresa é um tenant isolado (campo <code>company_id</code> em todas as tabelas). Ao criar, defina o plano (limites e mensalidade) e o acesso do administrador do cliente.</Note>

      <div className="grid cols-4 mb">
        <div className="card stat"><div className="icon" style={{ background: 'rgba(255,90,31,.16)', color: '#ff8a4f' }}><Building2 size={22} /></div>
          <div className="label">Empresas</div><div className="value">{clients.length}</div><div className="sub">{active} ativas</div></div>
        <div className="card stat"><div className="icon" style={{ background: 'rgba(34,197,94,.16)', color: '#4ade80' }}><DollarSign size={22} /></div>
          <div className="label">MRR (receita recorrente)</div><div className="value">{brl(data.mrr)}</div><div className="sub">só empresas ativas</div></div>
        <div className="card stat"><div className="icon" style={{ background: 'rgba(59,130,246,.16)', color: '#60a5fa' }}><Users size={22} /></div>
          <div className="label">Usuários totais</div><div className="value">{clients.reduce((a, c) => a + c.users, 0)}</div></div>
        <div className="card stat"><div className="icon" style={{ background: 'rgba(234,179,8,.16)', color: '#fde047' }}><Grid3x3 size={22} /></div>
          <div className="label">Mesas gerenciadas</div><div className="value">{clients.reduce((a, c) => a + c.tables, 0)}</div></div>
      </div>

      {/* Planos disponíveis */}
      <div className="grid cols-3 mb">
        {Object.entries(PRESETS).map(([key, p]) => (
          <div className="card card-pad" key={key}>
            <div className="flex between">
              <strong style={{ fontSize: 16, textTransform: 'capitalize' }}>{PLANS[key][0]}</strong>
              <span className={'badge ' + PLANS[key][1]}>{key}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, margin: '8px 0' }}>{brl(p.monthly_fee)}<span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>/mês</span></div>
            <div className="muted" style={{ fontSize: 13 }}>Até {p.max_users} usuários · {p.max_tables} mesas · {p.max_orders} comandas</div>
          </div>
        ))}
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Empresa</th><th>CNPJ</th><th>Plano</th><th>Uso</th><th className="right">Mensalidade</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  {(c.logradouro || c.municipio) && <div className="muted" style={{ fontSize: 12 }}>
                    {[c.logradouro, c.numero].filter(Boolean).join(', ')}{c.bairro ? ` - ${c.bairro}` : ''}{c.municipio ? ` · ${c.municipio}/${c.uf}` : ''}
                  </div>}
                </td>
                <td className="muted">{c.document || '—'}</td>
                <td><span className={'badge ' + PLANS[c.plan][1]}>{PLANS[c.plan][0]}</span></td>
                <td className="muted" style={{ fontSize: 13 }}>{c.users}/{c.max_users} usuários · {c.tables}/{c.max_tables} mesas · até {c.max_orders} comandas</td>
                <td className="right" style={{ fontWeight: 700 }}>{brl(c.monthly_fee)}</td>
                <td><span className={'badge ' + STATUS[c.status][1]}>{STATUS[c.status][0]}</span></td>
                <td className="right">
                  <div className="flex" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-sm" onClick={() => setUsersOf(c)} title="Usuários de acesso desta empresa">
                      <Users size={14} /> Usuários</button>
                    {onEnter && <button className="btn btn-sm btn-primary" onClick={() => onEnter(c)} title="Ver o sistema deste cliente">
                      <LogIn size={14} /> Entrar</button>}
                    {c.status !== 'active'
                      ? <button className="btn btn-sm btn-success" onClick={() => setStatus(c, 'active')}><Check size={14} /> Ativar</button>
                      : <button className="btn btn-sm" onClick={() => setStatus(c, 'suspended')}>Suspender</button>}
                    <button className="btn btn-sm btn-ghost" onClick={() => openForm({ ...c })}><Pencil size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? `Editar · ${editing.name}` : 'Nova empresa'} onClose={() => setEditing(null)}
          footer={<>
            <button className="btn" onClick={() => setEditing(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={!editing.name}>Salvar</button>
          </>}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-row">
            <label>CNPJ <span className="muted">(digite e busque para puxar os dados)</span></label>
            <div className="flex" style={{ gap: 8, alignItems: 'stretch' }}>
              <input value={editing.document || ''} placeholder="00.000.000/0000-00"
                onChange={e => setEditing({ ...editing, document: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookupCnpj(); } }} />
              <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={lookupCnpj} disabled={cnpjLoading}>
                <Search size={16} /> {cnpjLoading ? 'Buscando…' : 'Buscar'}
              </button>
            </div>
          </div>
          {cnpjInfo && (
            <div className="placeholder-note" style={{ background: 'rgba(34,197,94,.12)', color: '#86efac', borderColor: 'rgba(34,197,94,.3)' }}>
              <Check size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>{cnpjInfo.razao_social}</strong>{cnpjInfo.situacao && ` · ${cnpjInfo.situacao}`}
                {cnpjInfo.nome_fantasia && <div>Nome fantasia: {cnpjInfo.nome_fantasia}</div>}
                {cnpjInfo.address && <div style={{ fontSize: 12 }}>{cnpjInfo.address}</div>}
                {cnpjInfo.phone && <div style={{ fontSize: 12 }}>Tel: {cnpjInfo.phone}</div>}
              </div>
            </div>
          )}
          <div className="form-row"><label>Nome da empresa</label>
            <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>

          {/* Endereço */}
          <div className="grid cols-2">
            <div className="form-row"><label>CEP</label>
              <input value={editing.cep || ''} onChange={e => setEditing({ ...editing, cep: e.target.value })} /></div>
            <div className="form-row"><label>Bairro</label>
              <input value={editing.bairro || ''} onChange={e => setEditing({ ...editing, bairro: e.target.value })} /></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 110px' }}>
            <div className="form-row"><label>Rua / Logradouro</label>
              <input value={editing.logradouro || ''} onChange={e => setEditing({ ...editing, logradouro: e.target.value })} /></div>
            <div className="form-row"><label>Número</label>
              <input value={editing.numero || ''} onChange={e => setEditing({ ...editing, numero: e.target.value })} /></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 80px' }}>
            <div className="form-row"><label>Cidade</label>
              <input value={editing.municipio || ''} onChange={e => setEditing({ ...editing, municipio: e.target.value })} /></div>
            <div className="form-row"><label>UF</label>
              <input value={editing.uf || ''} onChange={e => setEditing({ ...editing, uf: e.target.value })} /></div>
          </div>
          <div className="grid cols-2">
            <div className="form-row"><label>Telefone</label>
              <input value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></div>
            <div className="form-row"><label>E-mail</label>
              <input value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} /></div>
          </div>

          <div className="grid cols-2">
            <div className="form-row"><label>Plano</label>
              <select value={editing.plan} onChange={e => setEditing(applyPlan(editing, e.target.value))}>
                {Object.keys(PLANS).map(k => <option key={k} value={k}>{PLANS[k][0]}</option>)}
              </select></div>
            <div className="form-row"><label>Status</label>
              <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })}>
                {Object.keys(STATUS).map(k => <option key={k} value={k}>{STATUS[k][0]}</option>)}
              </select></div>
          </div>

          <div className="grid cols-3">
            <div className="form-row"><label>Máx. usuários</label>
              <input type="number" value={editing.max_users} onChange={e => setEditing({ ...editing, max_users: Number(e.target.value) })} /></div>
            <div className="form-row"><label>Máx. mesas</label>
              <input type="number" value={editing.max_tables} onChange={e => setEditing({ ...editing, max_tables: Number(e.target.value) })} /></div>
            <div className="form-row"><label>Máx. comandas abertas</label>
              <input type="number" value={editing.max_orders} onChange={e => setEditing({ ...editing, max_orders: Number(e.target.value) })} /></div>
          </div>
          <div className="form-row"><label>Mensalidade (R$)</label>
            <input type="number" step="0.01" value={editing.monthly_fee} onChange={e => setEditing({ ...editing, monthly_fee: Number(e.target.value) })} /></div>

          {!editing.id && (
            <>
              <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 14px' }} />
              <label style={{ fontSize: 13, color: 'var(--text)', marginBottom: 10 }}>Acesso do administrador do cliente</label>
              <div className="grid cols-2">
                <div className="form-row"><label>Nome</label>
                  <input value={editing.admin_name} onChange={e => setEditing({ ...editing, admin_name: e.target.value })} /></div>
                <div className="form-row"><label>E-mail (login)</label>
                  <input type="email" value={editing.admin_email} onChange={e => setEditing({ ...editing, admin_email: e.target.value })} /></div>
              </div>
              <div className="form-row"><label>Senha inicial</label>
                <input value={editing.admin_password} onChange={e => setEditing({ ...editing, admin_password: e.target.value })} placeholder="Defina uma senha de acesso" /></div>
            </>
          )}
        </Modal>
      )}

      {usersOf && <CompanyUsers company={usersOf} onClose={() => setUsersOf(null)} />}
    </>
  );
}

// ───── Usuários de acesso de uma empresa (gestão pelo painel SaaS) ─────
function CompanyUsers({ company, onClose }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(null);   // form de novo usuário
  const [editing, setEditing] = useState(null); // usuário em edição (id)
  const [reset, setReset] = useState(null);      // { id, password } redefinição de senha

  const load = () => api.get(`/saas/companies/${company.id}/users`).then(setUsers);
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function addUser() {
    setError('');
    try { await api.post(`/saas/companies/${company.id}/users`, adding); setAdding(null); load(); }
    catch (e) { setError(e.message); }
  }
  async function saveEdit() {
    setError('');
    try {
      await api.put(`/saas/users/${editing.id}`, { name: editing.name, email: editing.email, role: editing.role });
      setEditing(null); load();
    } catch (e) { setError(e.message); }
  }
  async function doReset() {
    setError('');
    if (!reset.password) { setError('Informe a nova senha.'); return; }
    try { await api.put(`/saas/users/${reset.id}`, { password: reset.password }); setReset(null); load(); }
    catch (e) { setError(e.message); }
  }
  async function toggleActive(u) {
    setError('');
    try { await api.put(`/saas/users/${u.id}`, { active: u.active ? 0 : 1 }); load(); }
    catch (e) { setError(e.message); }
  }

  return (
    <Modal title={`Usuários de acesso · ${company.name}`} onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Fechar</button>}>
      <Note>As senhas ficam protegidas (hash) e não podem ser exibidas. Para dar acesso a alguém, use <strong>Redefinir senha</strong> e repasse a nova senha.</Note>
      {error && <div className="error-msg">{error}</div>}

      <div className="flex between mb">
        <strong>{users ? `${users.length} usuário(s)` : 'Carregando…'}</strong>
        {!adding && <button className="btn btn-sm btn-primary" onClick={() => { setError(''); setAdding({ name: '', email: '', password: '', role: 'waiter' }); }}>
          <Plus size={15} /> Novo usuário</button>}
      </div>

      {adding && (
        <div className="card card-pad mb">
          <div className="grid cols-2">
            <div className="form-row"><label>Nome</label>
              <input value={adding.name} onChange={e => setAdding({ ...adding, name: e.target.value })} /></div>
            <div className="form-row"><label>E-mail (login)</label>
              <input type="email" value={adding.email} onChange={e => setAdding({ ...adding, email: e.target.value })} /></div>
          </div>
          <div className="grid cols-2">
            <div className="form-row"><label>Senha inicial</label>
              <input value={adding.password} onChange={e => setAdding({ ...adding, password: e.target.value })} /></div>
            <div className="form-row"><label>Perfil</label>
              <select value={adding.role} onChange={e => setAdding({ ...adding, role: e.target.value })}>
                {ROLE_KEYS.map(k => <option key={k} value={k}>{ROLE_LABELS[k]}</option>)}
              </select></div>
          </div>
          <div className="flex" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => setAdding(null)}>Cancelar</button>
            <button className="btn btn-sm btn-primary" onClick={addUser} disabled={!adding.name || !adding.email || !adding.password}>Adicionar</button>
          </div>
        </div>
      )}

      {users && (
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map(u => editing?.id === u.id ? (
              <tr key={u.id}>
                <td><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></td>
                <td><input type="email" value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} /></td>
                <td><select value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })}>
                  {ROLE_KEYS.map(k => <option key={k} value={k}>{ROLE_LABELS[k]}</option>)}</select></td>
                <td colSpan="2" className="right">
                  <button className="btn btn-sm" onClick={() => setEditing(null)}>Cancelar</button>
                  <button className="btn btn-sm btn-primary" onClick={saveEdit}>Salvar</button>
                </td>
              </tr>
            ) : reset?.id === u.id ? (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td colSpan="2">
                  <div className="flex" style={{ gap: 6, alignItems: 'center' }}>
                    <KeyRound size={15} />
                    <input value={reset.password} placeholder="Nova senha" autoFocus
                      onChange={e => setReset({ ...reset, password: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') doReset(); }} />
                  </div>
                </td>
                <td colSpan="2" className="right">
                  <button className="btn btn-sm" onClick={() => setReset(null)}>Cancelar</button>
                  <button className="btn btn-sm btn-primary" onClick={doReset}>Salvar senha</button>
                </td>
              </tr>
            ) : (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td className="muted">{u.email}</td>
                <td><span className="badge gray">{ROLE_LABELS[u.role] || u.role}</span></td>
                <td>{u.active ? <span className="badge green">Ativo</span> : <span className="badge red">Inativo</span>}</td>
                <td className="right">
                  <div className="flex" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-sm" onClick={() => { setError(''); setReset({ id: u.id, password: '' }); }}><KeyRound size={14} /> Senha</button>
                    <button className="btn btn-sm btn-ghost" title="Editar" onClick={() => { setError(''); setEditing({ id: u.id, name: u.name, email: u.email, role: u.role }); }}><Pencil size={15} /></button>
                    <button className="btn btn-sm btn-ghost" title={u.active ? 'Desativar' : 'Ativar'} onClick={() => toggleActive(u)}>
                      {u.active ? <X size={15} color="#f87171" /> : <Check size={15} color="#4ade80" />}</button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan="5" className="muted">Nenhum usuário cadastrado nesta empresa.</td></tr>}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
