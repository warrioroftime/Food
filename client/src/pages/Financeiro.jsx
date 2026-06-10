import { useEffect, useState } from 'react';
import { api, brl } from '../api.js';
import { PageHead, Modal, Loading } from '../components/ui.jsx';
import { Plus, CheckCircle2, TrendingUp, TrendingDown, Scale } from 'lucide-react';

export default function Financeiro() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('payable');
  const [adding, setAdding] = useState(null);

  const load = () => api.get('/finance').then(setData);
  useEffect(() => { load(); }, []);

  async function pay(id) { await api.put(`/finance/${id}/pay`); load(); }
  async function add() {
    await api.post('/finance', { ...adding, kind: tab, amount: Number(adding.amount) || 0 });
    setAdding(null); load();
  }

  if (!data) return <Loading />;
  const t = data.totals;
  const balance = (t.receivableOpen + t.receivablePaid) - (t.payableOpen + t.payablePaid);
  const entries = data.entries.filter(e => e.kind === tab);

  return (
    <>
      <PageHead title="Financeiro" subtitle="Contas a pagar, a receber e fluxo de caixa">
        <button className="btn btn-primary" onClick={() => setAdding({ description: '', category: '', amount: '', due_date: '' })}>
          <Plus size={18} /> Novo lançamento</button>
      </PageHead>

      <div className="grid cols-3 mb">
        <div className="card stat"><div className="icon" style={{ background: '#dcfce7', color: '#16a34a' }}><TrendingUp size={22} /></div>
          <div className="label">A receber (em aberto)</div><div className="value">{brl(t.receivableOpen)}</div></div>
        <div className="card stat"><div className="icon" style={{ background: '#fee2e2', color: '#dc2626' }}><TrendingDown size={22} /></div>
          <div className="label">A pagar (em aberto)</div><div className="value">{brl(t.payableOpen)}</div></div>
        <div className="card stat"><div className="icon" style={{ background: '#dbeafe', color: '#2563eb' }}><Scale size={22} /></div>
          <div className="label">Saldo projetado</div><div className="value" style={{ color: balance >= 0 ? '#16a34a' : '#dc2626' }}>{brl(balance)}</div></div>
      </div>

      <div className="tabs">
        <button className={'tab' + (tab === 'payable' ? ' active' : '')} onClick={() => setTab('payable')}>Contas a Pagar</button>
        <button className={'tab' + (tab === 'receivable' ? ' active' : '')} onClick={() => setTab('receivable')}>Contas a Receber</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Descrição</th><th>Categoria</th><th>Vencimento</th><th className="right">Valor</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.description}</td>
                <td><span className="badge gray">{e.category || '—'}</span></td>
                <td>{e.due_date || '—'}</td>
                <td className="right" style={{ fontWeight: 700 }}>{brl(e.amount)}</td>
                <td>{e.paid ? <span className="badge green">Pago</span> : <span className="badge yellow">Em aberto</span>}</td>
                <td className="right">{!e.paid &&
                  <button className="btn btn-sm btn-success" onClick={() => pay(e.id)}><CheckCircle2 size={15} /> Baixar</button>}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan="6" className="muted">Nenhum lançamento.</td></tr>}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title={tab === 'payable' ? 'Nova conta a pagar' : 'Nova conta a receber'} onClose={() => setAdding(null)}
          footer={<><button className="btn" onClick={() => setAdding(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={add} disabled={!adding.description || !adding.amount}>Salvar</button></>}>
          <div className="form-row"><label>Descrição</label>
            <input value={adding.description} onChange={e => setAdding({ ...adding, description: e.target.value })} /></div>
          <div className="grid cols-2">
            <div className="form-row"><label>Categoria</label>
              <input value={adding.category} onChange={e => setAdding({ ...adding, category: e.target.value })} placeholder="Ex: Insumos, Folha…" /></div>
            <div className="form-row"><label>Valor (R$)</label>
              <input type="number" step="0.01" value={adding.amount} onChange={e => setAdding({ ...adding, amount: e.target.value })} /></div>
          </div>
          <div className="form-row"><label>Vencimento</label>
            <input type="date" value={adding.due_date} onChange={e => setAdding({ ...adding, due_date: e.target.value })} /></div>
        </Modal>
      )}
    </>
  );
}
