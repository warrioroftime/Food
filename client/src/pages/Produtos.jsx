import { useEffect, useState } from 'react';
import { api, brl } from '../api.js';
import { PageHead, Modal, Loading } from '../components/ui.jsx';
import { Plus, Pencil, Trash2, Utensils, FolderTree, Tag } from 'lucide-react';

const TYPES = ['bebida', 'prato', 'porcao', 'sobremesa', 'combo'];
const STATIONS = ['cozinha', 'bar', 'churrasqueira', 'sobremesa'];
const empty = { name: '', description: '', price: '', cost: '', type: 'prato', category_id: '', active: 1 };

export default function Produtos() {
  const [products, setProducts] = useState(null);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [manageGroups, setManageGroups] = useState(false);

  const loadCats = () => api.get('/categories').then(setCats);
  const load = () => api.get('/products').then(setProducts);
  useEffect(() => { load(); loadCats(); }, []);

  async function save() {
    const body = { ...editing, price: Number(editing.price) || 0, cost: Number(editing.cost) || 0 };
    if (editing.id) await api.put('/products/' + editing.id, body);
    else await api.post('/products', body);
    setEditing(null); load();
  }
  async function remove(id) {
    if (!confirm('Excluir este produto?')) return;
    await api.del('/products/' + id); load();
  }
  async function openDetail(p) { setDetail(await api.get('/products/' + p.id)); }

  if (!products) return <Loading />;

  // Agrupar produtos por grupo (categoria)
  const groups = cats.map(c => ({ ...c, items: products.filter(p => p.category_id === c.id) }));
  const semGrupo = products.filter(p => !p.category_id);

  const ProductRows = ({ items }) => (
    <div className="card table-wrap mb">
      <table>
        <thead><tr><th>Produto</th><th>Tipo</th><th className="right">Custo</th><th className="right">Preço</th><th></th></tr></thead>
        <tbody>
          {items.map(p => (
            <tr key={p.id}>
              <td><div style={{ fontWeight: 700 }}>{p.name}</div><div className="muted" style={{ fontSize: 12 }}>{p.description}</div></td>
              <td><span className="badge gray" style={{ textTransform: 'capitalize' }}>{p.type}</span></td>
              <td className="right muted">{brl(p.cost)}</td>
              <td className="right" style={{ fontWeight: 700 }}>{brl(p.price)}</td>
              <td className="right">
                <div className="flex" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn-sm btn-ghost" title="Ficha técnica" onClick={() => openDetail(p)}><Utensils size={16} /></button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditing({ ...p })}><Pencil size={16} /></button>
                  <button className="btn btn-sm btn-ghost" onClick={() => remove(p.id)}><Trash2 size={16} color="#f87171" /></button>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan="5" className="muted">Nenhum produto neste grupo.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <PageHead title="Produtos" subtitle="Cardápio organizado por grupos, com preços e ficha técnica">
        <button className="btn" onClick={() => setManageGroups(true)}><FolderTree size={18} /> Grupos</button>
        <button className="btn btn-primary" onClick={() => setEditing({ ...empty })}><Plus size={18} /> Novo produto</button>
      </PageHead>

      {groups.map(g => (
        <div key={g.id}>
          <div className="flex mb" style={{ gap: 10, marginTop: 4 }}>
            <Tag size={16} color="var(--primary)" />
            <strong style={{ fontSize: 15 }}>{g.name}</strong>
            <span className="badge gray" style={{ textTransform: 'capitalize' }}>{g.station}</span>
            <span className="muted" style={{ fontSize: 12 }}>{g.items.length} item(ns)</span>
          </div>
          <ProductRows items={g.items} />
        </div>
      ))}

      {semGrupo.length > 0 && (
        <div>
          <div className="flex mb" style={{ gap: 10, marginTop: 4 }}>
            <Tag size={16} color="var(--text-dim)" /><strong style={{ fontSize: 15 }}>Sem grupo</strong>
            <span className="muted" style={{ fontSize: 12 }}>{semGrupo.length} item(ns)</span>
          </div>
          <ProductRows items={semGrupo} />
        </div>
      )}

      {/* ───── Produto (novo/editar) ───── */}
      {editing && (
        <Modal title={editing.id ? 'Editar produto' : 'Novo produto'} onClose={() => setEditing(null)}
          footer={<>
            <button className="btn" onClick={() => setEditing(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={!editing.name}>Salvar</button>
          </>}>
          <div className="form-row"><label>Nome</label>
            <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
          <div className="form-row"><label>Descrição</label>
            <input value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
          <div className="grid cols-2">
            <div className="form-row"><label>Preço (R$)</label>
              <input type="number" step="0.01" value={editing.price} onChange={e => setEditing({ ...editing, price: e.target.value })} /></div>
            <div className="form-row"><label>Custo (R$)</label>
              <input type="number" step="0.01" value={editing.cost} onChange={e => setEditing({ ...editing, cost: e.target.value })} /></div>
          </div>
          <div className="grid cols-2">
            <div className="form-row"><label>Tipo</label>
              <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div className="form-row"><label>Grupo</label>
              <select value={editing.category_id || ''} onChange={e => setEditing({ ...editing, category_id: e.target.value })}>
                <option value="">— Sem grupo —</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
          </div>
        </Modal>
      )}

      {/* ───── Ficha técnica ───── */}
      {detail && (
        <Modal title={`Ficha técnica · ${detail.name}`} onClose={() => setDetail(null)}>
          <p className="muted mb">Ingredientes consumidos por unidade vendida (baixa automática no estoque):</p>
          {detail.recipe.length === 0
            ? <div className="empty">Nenhuma ficha técnica cadastrada para este produto.</div>
            : <table><thead><tr><th>Ingrediente</th><th className="right">Quantidade</th></tr></thead>
                <tbody>{detail.recipe.map(r => (
                  <tr key={r.id}><td>{r.name}</td><td className="right">{r.qty} {r.unit}</td></tr>
                ))}</tbody></table>}
        </Modal>
      )}

      {/* ───── Gerenciar grupos ───── */}
      {manageGroups && <GroupManager cats={cats} onClose={() => { setManageGroups(false); load(); }} reload={loadCats} />}
    </>
  );
}

function GroupManager({ cats, onClose, reload }) {
  const [form, setForm] = useState({ name: '', station: 'cozinha' });
  const [edit, setEdit] = useState(null);

  async function add() {
    await api.post('/categories', form);
    setForm({ name: '', station: 'cozinha' }); reload();
  }
  async function saveEdit() {
    await api.put('/categories/' + edit.id, { name: edit.name, station: edit.station });
    setEdit(null); reload();
  }
  async function remove(c) {
    if (!confirm(`Excluir o grupo "${c.name}"? Os produtos ficarão sem grupo.`)) return;
    await api.del('/categories/' + c.id); reload();
  }

  return (
    <Modal title="Grupos de produto" onClose={onClose}>
      <div className="card card-pad mb">
        <strong>Novo grupo</strong>
        <div className="grid cols-2 mt">
          <div><label>Nome</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Pizzas" /></div>
          <div><label>Setor (impressão/KDS)</label>
            <select value={form.station} onChange={e => setForm({ ...form, station: e.target.value })}>
              {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select></div>
        </div>
        <button className="btn btn-primary mt" onClick={add} disabled={!form.name}><Plus size={16} /> Adicionar grupo</button>
      </div>

      <table>
        <thead><tr><th>Grupo</th><th>Setor</th><th className="right">Produtos</th><th></th></tr></thead>
        <tbody>
          {cats.map(c => edit?.id === c.id ? (
            <tr key={c.id}>
              <td><input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></td>
              <td><select value={edit.station} onChange={e => setEdit({ ...edit, station: e.target.value })}>
                {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
              <td className="right">{c.products}</td>
              <td className="right"><button className="btn btn-sm btn-primary" onClick={saveEdit}>OK</button></td>
            </tr>
          ) : (
            <tr key={c.id}>
              <td style={{ fontWeight: 600 }}>{c.name}</td>
              <td><span className="badge gray" style={{ textTransform: 'capitalize' }}>{c.station}</span></td>
              <td className="right">{c.products}</td>
              <td className="right">
                <button className="btn btn-sm btn-ghost" onClick={() => setEdit({ id: c.id, name: c.name, station: c.station })}><Pencil size={15} /></button>
                <button className="btn btn-sm btn-ghost" onClick={() => remove(c)}><Trash2 size={15} color="#f87171" /></button>
              </td>
            </tr>
          ))}
          {cats.length === 0 && <tr><td colSpan="4" className="muted">Nenhum grupo cadastrado.</td></tr>}
        </tbody>
      </table>
    </Modal>
  );
}
