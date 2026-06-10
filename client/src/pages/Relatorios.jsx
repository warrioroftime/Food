import { useEffect, useState } from 'react';
import { api, brl } from '../api.js';
import { PageHead, Loading, Note } from '../components/ui.jsx';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#ff5a1f', '#2563eb', '#16a34a', '#d97706', '#7c3aed'];

export default function Relatorios() {
  const [d, setD] = useState(null);
  const [emp, setEmp] = useState([]);
  useEffect(() => {
    api.get('/dashboard').then(setD);
    api.get('/employees').then(e => setEmp(e.filter(u => u.role === 'waiter')));
  }, []);
  if (!d) return <Loading />;

  // Ranking de garçons (exemplo derivado — em produção viria de vendas por garçom)
  const ranking = emp.map((u, i) => ({ name: u.name.split(' ')[0], vendas: Math.round(2500 + Math.random() * 4000) }))
    .sort((a, b) => b.vendas - a.vendas);
  const payMix = [
    { name: 'PIX', value: 42 }, { name: 'Cartão', value: 35 }, { name: 'Dinheiro', value: 18 }, { name: 'Voucher', value: 5 }
  ];

  return (
    <>
      <PageHead title="Relatórios" subtitle="Indicadores de vendas, produtos e equipe" />
      <Note>Indicadores conectados ao banco (produtos mais vendidos e vendas). Ranking de garçons e mix de pagamento mostram o formato dos relatórios — prontos para ligar a períodos personalizados.</Note>

      <div className="grid cols-4 mb">
        <div className="card stat"><div className="label">Vendas hoje</div><div className="value">{brl(d.salesToday)}</div></div>
        <div className="card stat"><div className="label">Ticket médio</div><div className="value">{brl(d.ticket)}</div></div>
        <div className="card stat"><div className="label">Em aberto</div><div className="value">{brl(d.openValue)}</div></div>
        <div className="card stat"><div className="label">Comandas abertas</div><div className="value">{d.openOrders}</div></div>
      </div>

      <div className="grid cols-2 mb">
        <div className="card card-pad">
          <strong className="mb" style={{ display: 'block' }}>Produtos mais vendidos</strong>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.topProducts} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} fontSize={12} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={11} width={120} />
              <Tooltip />
              <Bar dataKey="qty" name="Qtd vendida" fill="#ff5a1f" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card card-pad">
          <strong className="mb" style={{ display: 'block' }}>Mix de formas de pagamento</strong>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={payMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {payMix.map((e, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Legend /><Tooltip formatter={(v) => v + '%'} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card card-pad">
        <strong className="mb" style={{ display: 'block' }}>Ranking de garçons (vendas no período)</strong>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={ranking}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
            <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={v => 'R$' + (v / 1000).toFixed(1) + 'k'} />
            <Tooltip formatter={(v) => brl(v)} />
            <Bar dataKey="vendas" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
