import { useState } from 'react';
import { brl } from '../api.js';
import { PageHead, Note } from '../components/ui.jsx';
import { Bike, MapPin, Phone, MessageCircle, Clock } from 'lucide-react';

const SAMPLE = [
  { id: 1024, customer: 'Roberto Almeida', phone: '(11) 99876-5432', bairro: 'Centro', fee: 6, total: 78.80, status: 'preparing', motoboy: 'Lucas', time: '12 min' },
  { id: 1025, customer: 'Fernanda Lima', phone: '(11) 98765-1234', bairro: 'Bela Vista', fee: 9, total: 45.90, status: 'out', motoboy: 'Diego', time: '24 min' },
  { id: 1026, customer: 'Pedro Santos', phone: '(11) 97654-9876', bairro: 'Consolação', fee: 8, total: 122.50, status: 'received', motoboy: '—', time: '3 min' },
];
const ST = { received: ['Recebido', 'blue'], preparing: ['Em preparo', 'yellow'], out: ['Saiu p/ entrega', 'green'], done: ['Entregue', 'gray'] };
const FEES = [{ b: 'Centro', f: 6 }, { b: 'Bela Vista', f: 9 }, { b: 'Consolação', f: 8 }, { b: 'Pinheiros', f: 12 }, { b: 'Vila Mariana', f: 10 }];

export default function Delivery() {
  const [orders, setOrders] = useState(SAMPLE);
  const advance = (id) => setOrders(o => o.map(x => x.id === id
    ? { ...x, status: x.status === 'received' ? 'preparing' : x.status === 'preparing' ? 'out' : 'done' } : x));

  return (
    <>
      <PageHead title="Delivery" subtitle="Pedidos, motoboys, taxa por bairro e integração WhatsApp" />
      <Note>Tela de delivery com dados de exemplo e fluxo de status interativo. Pronta para conectar ao mesmo motor de comandas (pedidos do tipo <code>delivery</code> já existem na API) e ao WhatsApp.</Note>

      <div className="grid" style={{ gridTemplateColumns: '1fr 300px', alignItems: 'start' }}>
        <div className="grid" style={{ gap: 14 }}>
          {orders.map(o => (
            <div className="card card-pad" key={o.id}>
              <div className="flex between mb">
                <strong>Pedido #{o.id} · {o.customer}</strong>
                <span className={'badge ' + ST[o.status][1]}>{ST[o.status][0]}</span>
              </div>
              <div className="flex" style={{ gap: 20, flexWrap: 'wrap', fontSize: 13 }} >
                <span className="muted"><MapPin size={13} style={{ verticalAlign: -2 }} /> {o.bairro} · taxa {brl(o.fee)}</span>
                <span className="muted"><Phone size={13} style={{ verticalAlign: -2 }} /> {o.phone}</span>
                <span className="muted"><Bike size={13} style={{ verticalAlign: -2 }} /> {o.motoboy}</span>
                <span className="muted"><Clock size={13} style={{ verticalAlign: -2 }} /> {o.time}</span>
              </div>
              <div className="flex between mt" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <strong style={{ fontSize: 18 }}>{brl(o.total)}</strong>
                <div className="flex">
                  <button className="btn btn-sm"><MessageCircle size={14} color="#16a34a" /> WhatsApp</button>
                  {o.status !== 'done' && <button className="btn btn-sm btn-primary" onClick={() => advance(o.id)}>Avançar status</button>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card card-pad">
          <strong>Taxa de entrega por bairro</strong>
          <table className="mt">
            <tbody>{FEES.map(f => (
              <tr key={f.b}><td>{f.b}</td><td className="right" style={{ fontWeight: 700 }}>{brl(f.f)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}
