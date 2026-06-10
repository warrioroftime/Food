import { useState } from 'react';
import { brl } from '../api.js';
import { Modal } from './ui.jsx';
import { Plus, Minus, Trash2, Users, Check } from 'lucide-react';

const METHODS = [['dinheiro', 'Dinheiro'], ['pix', 'PIX'], ['cartao', 'Cartão'], ['voucher', 'Voucher']];
const LABEL = Object.fromEntries(METHODS);

// Fechamento de conta: divisão por pessoas + múltiplas formas de pagamento
export default function PaymentModal({ total, title = 'Fechar conta', onClose, onConfirm }) {
  const [people, setPeople] = useState(1);
  const [payments, setPayments] = useState([]);

  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = Math.round((total - paid) * 100) / 100;
  const change = paid > total ? Math.round((paid - total) * 100) / 100 : 0;
  const perPerson = Math.round((total / Math.max(1, people)) * 100) / 100;
  const fullyPaid = total > 0 && paid + 1e-6 >= total;

  const addPayment = (method, amount) =>
    setPayments(p => [...p, { method, amount: amount != null ? amount : (remaining > 0 ? remaining : 0) }]);
  const setAmt = (i, v) => setPayments(p => p.map((x, idx) => idx === i ? { ...x, amount: v } : x));
  const removePay = (i) => setPayments(p => p.filter((_, idx) => idx !== i));

  // Cria um pagamento por pessoa, do mesmo valor (divisão igualitária)
  const splitEqually = (method) =>
    setPayments(Array.from({ length: people }, () => ({ method, amount: perPerson })));

  function confirm() {
    const list = payments.map(p => ({ method: p.method, amount: Number(p.amount) || 0 })).filter(p => p.amount > 0);
    onConfirm(list.length ? list : [{ method: 'dinheiro', amount: total }]);
  }

  return (
    <Modal title={title} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-success" onClick={confirm} disabled={!fullyPaid}>
          <Check size={16} /> Confirmar pagamento
        </button>
      </>}>

      {/* Total + divisão */}
      <div className="card card-pad mb">
        <div className="flex between">
          <div>
            <div className="muted" style={{ fontSize: 12 }}>Total a pagar</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{brl(total)}</div>
          </div>
          <div className="right">
            <div className="muted" style={{ fontSize: 12 }}>Dividir entre</div>
            <div className="qty-step" style={{ marginTop: 4 }}>
              <button onClick={() => setPeople(n => Math.max(1, n - 1))}><Minus size={14} /></button>
              <span>{people}</span>
              <button onClick={() => setPeople(n => n + 1)}><Plus size={14} /></button>
            </div>
          </div>
        </div>
        {people > 1 && (
          <div className="split-info mt">
            <Users size={15} />
            <span>{people} pessoas · <strong>{brl(perPerson)}</strong> por pessoa</span>
            <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => splitEqually('dinheiro')}>
              Dividir igualmente
            </button>
          </div>
        )}
      </div>

      {/* Adicionar forma de pagamento */}
      <label>Formas de pagamento {remaining > 0 && <span className="muted">(toque para lançar o que falta)</span>}</label>
      <div className="grid cols-2 mt mb">
        {METHODS.map(([k, l]) => (
          <button key={k} className="btn" onClick={() => addPayment(k)} disabled={remaining <= 0 && payments.length > 0}>
            <Plus size={14} /> {l}
          </button>
        ))}
      </div>

      {/* Lançamentos */}
      {payments.map((p, i) => (
        <div className="cart-line" key={i}>
          <span className="badge gray" style={{ minWidth: 76, justifyContent: 'center' }}>{LABEL[p.method]}</span>
          <input type="number" step="0.01" value={p.amount} onChange={e => setAmt(i, e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-sm btn-ghost" onClick={() => removePay(i)}><Trash2 size={15} color="#f87171" /></button>
        </div>
      ))}

      {/* Resumo */}
      <div className="pay-summary mt">
        <div className="flex between"><span className="muted">Pago</span><strong>{brl(paid)}</strong></div>
        {remaining > 0 && <div className="flex between"><span className="muted">Falta</span><strong style={{ color: '#f87171' }}>{brl(remaining)}</strong></div>}
        {change > 0 && <div className="flex between"><span className="muted">Troco</span><strong style={{ color: '#4ade80' }}>{brl(change)}</strong></div>}
      </div>
    </Modal>
  );
}
