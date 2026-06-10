import { useEffect, useState } from 'react';
import { api, brl } from '../api.js';
import { PageHead, Modal, Loading } from '../components/ui.jsx';
import { Plus, Pencil, Trash2, Utensils } from 'lucide-react';

const TYPES = ['bebida', 'prato', 'porcao', 'sobremesa', 'combo'];
const empty = { name: '', description: '', price: '', cost: '', type: 'prato', category_id: '', active: 1 };

export default function Produtos() {
  const [products, setProducts] = useState(null);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = () => api.get('/products').then(setProducts);
  useEffect(() => { load(); api.get('/categories').then(setCats); }, []);

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
  async function openDetail(p) {
    setDetail(await api.get('/products/' + p.id));
  }

  if (!products) return <Loading />;

  return (
    <>
      <PageHead title="Produtos" subtitle="Cardápio, preços, tipos e ficha técnica">
        <button className="btn btn-primary" onClick={() => setEditing({ ...empty })}><Plus size={18} /> Novo produto</button>
      </PageHead>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Produto</th><th>Categoria</th><th>Tipo</th><th className="right">Custo</th><th className="right">Preço</th><th></th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{p.description}</div>
                </td>
                <td>{p.category_name || '—'}</td>
                <td><span className="badge gray" style={{ textTransform: 'capitalize' }}>{p.type}</span></td>
                <td className="right muted">{brl(p.cost)}</td>
                <td className="right" style={{ fontWeight: 700 }}>{brl(p.price)}</td>
                <td className="right">
                  <div className="flex" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-sm btn-ghost" title="Ficha técnica" onClick={() => openDetail(p)}><Utensils size={16} /></button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditing({ ...p })}><Pencil size={16} /></button>
                    <button className="btn btn-sm btn-ghost" onClick={() => remove(p.id)}><Trash2 size={16} color="#dc2626" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
            <div className="form-row"><label>Categoria</label>
              <select value={editing.category_id || ''} onChange={e => setEditing({ ...editing, category_id: e.target.value })}>
                <option value="">— Sem categoria —</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
          </div>
        </Modal>
      )}

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
    </>
  );
}
