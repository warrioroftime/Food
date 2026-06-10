import { useEffect, useState } from 'react';
import { api, brl } from '../api.js';
import { PageHead, Modal, Loading } from '../components/ui.jsx';
import { Lock, Unlock, ArrowDownCircle, ArrowUpCircle, Banknote } from 'lucide-react';

export default function PDV() {
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null); // 'open' | 'close' | 'sangria' | 'suprimento'
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const load = () => api.get('/cash/current').then(setData);
  useEffect(() => { load(); }, []);

  async function submit() {
    const v = Number(amount) || 0;
    if (modal === 'open') await api.post('/cash/open', { opening_amount: v });
    if (modal === 'close') await api.post('/cash/close', { closing_amount: v });
    if (modal === 'sangria') await api.post('/cash/movement', { type: 'sangria', amount: v, note });
    if (modal === 'suprimento') await api.post('/cash/movement', { type: 'suprimento', amount: v, note });
    setModal(null); setAmount(''); setNote(''); load();
  }

  if (!data) return <Loading />;
  const s = data.session;

  if (!s) return (
    <>
      <PageHead title="PDV / Caixa" subtitle="Frente de caixa" />
      <div className="card card-pad empty">
        <Lock size={40} />
        <h3 className="mt">Caixa fechado</h3>
        <p className="muted mb">Abra o caixa para iniciar as vendas do dia.</p>
        <button className="btn btn-primary" onClick={() => setModal('open')}><Unlock size={18} /> Abrir caixa</button>
      </div>
      {modal && <MoneyModal modal={modal} amount={amount} setAmount={setAmount} note={note} setNote={setNote} onClose={() => setModal(null)} onSubmit={submit} />}
    </>
  );

  const sales = data.payments.reduce((a, p) => a + p.total, 0);
  const tips = data.payments.reduce((a, p) => a + (p.tips || 0), 0);
  const suprimentos = data.movements.filter(m => m.type === 'suprimento').reduce((a, m) => a + m.amount, 0);
  const sangrias = data.movements.filter(m => m.type === 'sangria').reduce((a, m) => a + m.amount, 0);
  const dinheiro = data.payments.find(p => p.method === 'dinheiro')?.total || 0;
  const expectedCash = s.opening_amount + suprimentos - sangrias + dinheiro;

  return (
    <>
      <PageHead title="PDV / Caixa" subtitle={`Aberto desde ${s.opened_at} · troco inicial ${brl(s.opening_amount)}`}>
        <span className="badge green"><Unlock size={13} /> Caixa aberto</span>
      </PageHead>

      <div className="grid cols-4 mb">
        <div className="card stat"><div className="label">Vendas no caixa</div><div className="value">{brl(sales)}</div></div>
        <div className="card stat"><div className="label">Em dinheiro</div><div className="value">{brl(dinheiro)}</div></div>
        <div className="card stat"><div className="label">Gorjetas</div><div className="value">{brl(tips)}</div></div>
        <div className="card stat"><div className="label">Saldo esperado (gaveta)</div><div className="value" style={{ color: '#16a34a' }}>{brl(expectedCash)}</div></div>
      </div>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <strong>Recebimentos por forma de pagamento</strong>
          <table className="mt">
            <thead><tr><th>Forma</th><th className="right">Valor</th></tr></thead>
            <tbody>
              {data.payments.length === 0 && <tr><td colSpan="2" className="muted">Nenhum recebimento ainda.</td></tr>}
              {data.payments.map((p, i) => (
                <tr key={i}><td style={{ textTransform: 'capitalize' }}>{p.method}</td><td className="right">{brl(p.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card card-pad">
          <strong>Movimentações de caixa</strong>
          <div className="grid cols-2 mt mb">
            <button className="btn" onClick={() => setModal('suprimento')}><ArrowDownCircle size={16} color="#16a34a" /> Suprimento</button>
            <button className="btn" onClick={() => setModal('sangria')}><ArrowUpCircle size={16} color="#dc2626" /> Sangria</button>
          </div>
          <table>
            <tbody>
              {data.movements.length === 0 && <tr><td className="muted">Sem movimentações.</td></tr>}
              {data.movements.map(m => (
                <tr key={m.id}>
                  <td><span className={'badge ' + (m.type === 'suprimento' ? 'green' : 'red')}>{m.type}</span> {m.note}</td>
                  <td className="right">{m.type === 'sangria' ? '−' : '+'}{brl(m.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn btn-danger mt" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setModal('close')}>
            <Lock size={16} /> Fechar caixa
          </button>
        </div>
      </div>

      {modal && <MoneyModal modal={modal} amount={amount} setAmount={setAmount} note={note} setNote={setNote}
        expected={expectedCash} onClose={() => setModal(null)} onSubmit={submit} />}
    </>
  );
}

const TITLES = { open: 'Abrir caixa', close: 'Fechar caixa', sangria: 'Sangria (retirada)', suprimento: 'Suprimento (entrada)' };

function MoneyModal({ modal, amount, setAmount, note, setNote, expected, onClose, onSubmit }) {
  return (
    <Modal title={TITLES[modal]} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={onSubmit}><Banknote size={16} /> Confirmar</button>
      </>}>
      {modal === 'close' && expected != null &&
        <div className="card card-pad mb"><div className="muted">Saldo esperado em dinheiro</div><div style={{ fontSize: 22, fontWeight: 800 }}>{brl(expected)}</div></div>}
      <div className="form-row">
        <label>{modal === 'open' ? 'Troco inicial (R$)' : modal === 'close' ? 'Valor contado na gaveta (R$)' : 'Valor (R$)'}</label>
        <input type="number" step="0.01" value={amount} autoFocus onChange={e => setAmount(e.target.value)} />
      </div>
      {(modal === 'sangria' || modal === 'suprimento') &&
        <div className="form-row"><label>Observação</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: pagamento fornecedor" /></div>}
    </Modal>
  );
}
