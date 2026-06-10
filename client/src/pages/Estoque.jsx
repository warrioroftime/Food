import { useEffect, useState } from 'react';
import { api, brl } from '../api.js';
import { PageHead, Modal, Loading } from '../components/ui.jsx';
import { Plus, AlertTriangle, ArrowDownUp } from 'lucide-react';

export default function Estoque() {
  const [list, setList] = useState(null);
  const [move, setMove] = useState(null);
  const [adding, setAdding] = useState(null);

  const load = () => api.get('/ingredients').then(setList);
  useEffect(() => { load(); }, []);

  async function doMove() {
    await api.post('/stock/movement', { ingredient_id: move.id, type: move.type, qty: Number(move.qty) || 0, note: move.note });
    setMove(null); load();
  }
  async function addItem() {
    await api.post('/ingredients', { ...adding, stock: Number(adding.stock) || 0, min_stock: Number(adding.min_stock) || 0, cost: Number(adding.cost) || 0 });
    setAdding(null); load();
  }

  if (!list) return <Loading />;
  const low = list.filter(i => i.stock <= i.min_stock);

  return (
    <>
      <PageHead title="Estoque" subtitle="Insumos, entradas, baixas automáticas por venda e alertas">
        <button className="btn btn-primary" onClick={() => setAdding({ name: '', unit: 'un', stock: '', min_stock: '', cost: '' })}><Plus size={18} /> Novo insumo</button>
      </PageHead>

      {low.length > 0 && (
        <div className="card card-pad mb" style={{ borderLeft: '4px solid #d97706' }}>
          <div className="flex" style={{ gap: 10 }}><AlertTriangle color="#d97706" />
            <div><strong>{low.length} insumo(s) abaixo do estoque mínimo:</strong> <span className="muted">{low.map(i => i.name).join(', ')}</span></div>
          </div>
        </div>
      )}

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Insumo</th><th className="right">Estoque atual</th><th className="right">Mínimo</th><th className="right">Custo unit.</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map(i => (
              <tr key={i.id}>
                <td style={{ fontWeight: 600 }}>{i.name}</td>
                <td className="right">{i.stock} {i.unit}</td>
                <td className="right muted">{i.min_stock} {i.unit}</td>
                <td className="right">{brl(i.cost)}</td>
                <td>{i.stock <= i.min_stock
                  ? <span className="badge red">Repor</span>
                  : <span className="badge green">OK</span>}</td>
                <td className="right">
                  <button className="btn btn-sm" onClick={() => setMove({ id: i.id, name: i.name, type: 'entrada', qty: '', note: '' })}>
                    <ArrowDownUp size={15} /> Movimentar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {move && (
        <Modal title={`Movimentar · ${move.name}`} onClose={() => setMove(null)}
          footer={<><button className="btn" onClick={() => setMove(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={doMove}>Confirmar</button></>}>
          <div className="form-row"><label>Tipo</label>
            <select value={move.type} onChange={e => setMove({ ...move, type: e.target.value })}>
              <option value="entrada">Entrada (compra/reposição)</option>
              <option value="saida">Saída</option>
              <option value="perda">Perda / quebra</option>
              <option value="ajuste">Ajuste de inventário</option>
            </select></div>
          <div className="form-row"><label>Quantidade</label>
            <input type="number" step="0.01" value={move.qty} onChange={e => setMove({ ...move, qty: e.target.value })} /></div>
          <div className="form-row"><label>Observação</label>
            <input value={move.note} onChange={e => setMove({ ...move, note: e.target.value })} /></div>
        </Modal>
      )}

      {adding && (
        <Modal title="Novo insumo" onClose={() => setAdding(null)}
          footer={<><button className="btn" onClick={() => setAdding(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={addItem} disabled={!adding.name}>Salvar</button></>}>
          <div className="form-row"><label>Nome</label>
            <input value={adding.name} onChange={e => setAdding({ ...adding, name: e.target.value })} /></div>
          <div className="grid cols-2">
            <div className="form-row"><label>Unidade</label>
              <select value={adding.unit} onChange={e => setAdding({ ...adding, unit: e.target.value })}>
                {['un', 'g', 'kg', 'ml', 'l'].map(u => <option key={u}>{u}</option>)}
              </select></div>
            <div className="form-row"><label>Custo unit. (R$)</label>
              <input type="number" step="0.01" value={adding.cost} onChange={e => setAdding({ ...adding, cost: e.target.value })} /></div>
            <div className="form-row"><label>Estoque inicial</label>
              <input type="number" value={adding.stock} onChange={e => setAdding({ ...adding, stock: e.target.value })} /></div>
            <div className="form-row"><label>Estoque mínimo</label>
              <input type="number" value={adding.min_stock} onChange={e => setAdding({ ...adding, min_stock: e.target.value })} /></div>
          </div>
        </Modal>
      )}
    </>
  );
}
