import { useEffect, useState } from 'react';
import { api, brl } from '../api.js';
import { PageHead, Loading } from '../components/ui.jsx';
import { DollarSign, ClipboardList, Grid3x3, Receipt, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Stat = ({ icon: Icon, label, value, sub, color, bg }) => (
  <div className="card stat">
    <div className="icon" style={{ background: bg, color }}><Icon size={22} /></div>
    <div className="label">{label}</div>
    <div className="value">{value}</div>
    {sub && <div className="sub">{sub}</div>}
  </div>
);

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/dashboard').then(setD).catch(() => {}); }, []);
  if (!d) return <Loading />;

  return (
    <>
      <PageHead title="Dashboard" subtitle="Visão geral do seu estabelecimento em tempo real" />
      <div className="grid cols-4 mb">
        <Stat icon={DollarSign} label="Vendas hoje" value={brl(d.salesToday)} sub={`${d.ordersToday} pedidos pagos`} color="#16a34a" bg="#dcfce7" />
        <Stat icon={Receipt} label="Ticket médio" value={brl(d.ticket)} sub="por pedido pago" color="#2563eb" bg="#dbeafe" />
        <Stat icon={ClipboardList} label="Comandas abertas" value={d.openOrders} sub={`${brl(d.openValue)} em aberto`} color="#d97706" bg="#fef3c7" />
        <Stat icon={Grid3x3} label="Mesas ocupadas" value={`${d.tables.occupied || 0}/${d.tables.total || 0}`} sub={`${d.tables.free || 0} livres · ${d.tables.reserved || 0} reservadas`} color="#ff5a1f" bg="#ffe8df" />
      </div>

      <div className="grid cols-2 mb" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        <div className="card card-pad">
          <div className="flex between mb">
            <strong>Vendas da semana</strong>
            <span className="badge green"><TrendingUp size={13} /> projeção</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.week}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={12} />
              <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={v => 'R$' + (v/1000).toFixed(0) + 'k'} />
              <Tooltip formatter={(v) => brl(v)} />
              <Bar dataKey="total" fill="#ff5a1f" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card card-pad">
          <strong>Produtos mais vendidos</strong>
          <div className="mt">
            {d.topProducts.length === 0 && <div className="muted">Sem vendas registradas ainda.</div>}
            {d.topProducts.map((p, i) => (
              <div className="list-row" key={i}>
                <div className="avatar" style={{ background: '#ffe8df', color: '#ff5a1f', width: 30, height: 30, fontSize: 13 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{p.qty} un · {brl(p.total)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {d.lowStock > 0 && (
        <div className="card card-pad" style={{ borderLeft: '4px solid #d97706' }}>
          <div className="flex" style={{ gap: 12 }}>
            <AlertTriangle color="#d97706" />
            <div>
              <strong>{d.lowStock} item(ns) com estoque abaixo do mínimo</strong>
              <div className="muted">Verifique o módulo de Estoque para reposição.</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
