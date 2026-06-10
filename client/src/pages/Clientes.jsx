import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { PageHead, Modal, Loading } from '../components/ui.jsx';
import { Plus, Pencil, Trash2, Phone, Gift, Star } from 'lucide-react';

const empty = { name: '', phone: '', cpf: '', address: '', birthday: '' };

export default function Clientes() {
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = () => api.get('/customers').then(setList);
  useEffect(() => { load(); }, []);

  async function save() {
    if (editing.id) await api.put('/customers/' + editing.id, editing);
    else await api.post('/customers', editing);
    setEditing(null); load();
  }
  async function remove(id) {
    if (!confirm('Excluir cliente?')) return;
    await api.del('/customers/' + id); load();
  }

  if (!list) return <Loading />;

  return (
    <>
      <PageHead title="Clientes" subtitle="Cadastro, fidelidade e histórico">
        <button className="btn btn-primary" onClick={() => setEditing({ ...empty })}><Plus size={18} /> Novo cliente</button>
      </PageHead>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Contato</th><th>CPF</th><th>Aniversário</th><th className="right">Fidelidade</th><th></th></tr></thead>
          <tbody>
            {list.map(c => (
              <tr key={c.id}>
                <td><div style={{ fontWeight: 700 }}>{c.name}</div><div className="muted" style={{ fontSize: 12 }}>{c.address}</div></td>
                <td><Phone size={13} style={{ verticalAlign: -2 }} /> {c.phone}</td>
                <td className="muted">{c.cpf}</td>
                <td>{c.birthday ? <span className="badge yellow"><Gift size={12} /> {c.birthday}</span> : '—'}</td>
                <td className="right"><span className="badge blue"><Star size={12} /> {c.loyalty_points} pts</span></td>
                <td className="right">
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditing({ ...c })}><Pencil size={16} /></button>
                  <button className="btn btn-sm btn-ghost" onClick={() => remove(c.id)}><Trash2 size={16} color="#dc2626" /></button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan="6" className="muted">Nenhum cliente cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Editar cliente' : 'Novo cliente'} onClose={() => setEditing(null)}
          footer={<>
            <button className="btn" onClick={() => setEditing(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={!editing.name}>Salvar</button>
          </>}>
          <div className="form-row"><label>Nome</label>
            <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
          <div className="grid cols-2">
            <div className="form-row"><label>Telefone</label>
              <input value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></div>
            <div className="form-row"><label>CPF</label>
              <input value={editing.cpf || ''} onChange={e => setEditing({ ...editing, cpf: e.target.value })} /></div>
          </div>
          <div className="form-row"><label>Endereço</label>
            <input value={editing.address || ''} onChange={e => setEditing({ ...editing, address: e.target.value })} /></div>
          <div className="form-row"><label>Aniversário</label>
            <input type="date" value={editing.birthday || ''} onChange={e => setEditing({ ...editing, birthday: e.target.value })} /></div>
        </Modal>
      )}
    </>
  );
}
