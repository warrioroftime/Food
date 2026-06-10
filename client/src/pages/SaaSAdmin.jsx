import { useEffect, useState } from 'react';
import { api, brl } from '../api.js';
import { PageHead, Loading, Note } from '../components/ui.jsx';
import { Building2, Users, Grid3x3, DollarSign } from 'lucide-react';

const PLANS = { basic: ['Básico', 'gray'], pro: ['Pro', 'blue'], enterprise: ['Enterprise', 'yellow'] };
const STATUS = { active: ['Ativa', 'green'], trial: ['Trial', 'yellow'], suspended: ['Suspensa', 'red'] };

export default function SaaSAdmin() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/saas/companies').then(setData); }, []);
  if (!data) return <Loading />;

  const active = data.companies.filter(c => c.status === 'active').length;

  return (
    <>
      <PageHead title="Administração SaaS" subtitle="Multiempresa — gestão de clientes, planos e cobrança" />
      <Note>Painel do dono do SaaS. Cada empresa é um tenant isolado (campo <code>company_id</code> em todas as tabelas). Aqui controla planos, limites e faturamento recorrente.</Note>

      <div className="grid cols-4 mb">
        <div className="card stat"><div className="icon" style={{ background: '#ffe8df', color: '#ff5a1f' }}><Building2 size={22} /></div>
          <div className="label">Empresas</div><div className="value">{data.companies.length}</div><div className="sub">{active} ativas</div></div>
        <div className="card stat"><div className="icon" style={{ background: '#dcfce7', color: '#16a34a' }}><DollarSign size={22} /></div>
          <div className="label">MRR (receita recorrente)</div><div className="value">{brl(data.mrr)}</div></div>
        <div className="card stat"><div className="icon" style={{ background: '#dbeafe', color: '#2563eb' }}><Users size={22} /></div>
          <div className="label">Usuários totais</div><div className="value">{data.companies.reduce((a, c) => a + c.users, 0)}</div></div>
        <div className="card stat"><div className="icon" style={{ background: '#fef3c7', color: '#d97706' }}><Grid3x3 size={22} /></div>
          <div className="label">Mesas gerenciadas</div><div className="value">{data.companies.reduce((a, c) => a + c.tables, 0)}</div></div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Empresa</th><th>CNPJ</th><th>Plano</th><th>Uso</th><th className="right">Mensalidade</th><th>Status</th></tr></thead>
          <tbody>
            {data.companies.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 700 }}>{c.name}</td>
                <td className="muted">{c.document}</td>
                <td><span className={'badge ' + PLANS[c.plan][1]}>{PLANS[c.plan][0]}</span></td>
                <td className="muted" style={{ fontSize: 13 }}>{c.users}/{c.max_users} usuários · {c.tables}/{c.max_tables} mesas</td>
                <td className="right" style={{ fontWeight: 700 }}>{brl(c.monthly_fee)}</td>
                <td><span className={'badge ' + STATUS[c.status][1]}>{STATUS[c.status][0]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
