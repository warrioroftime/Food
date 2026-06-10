import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { PageHead, Loading, Note } from '../components/ui.jsx';

const ROLES = {
  admin: ['Administrador', 'red'], manager: ['Gerente', 'blue'],
  cashier: ['Caixa', 'yellow'], waiter: ['Garçom', 'green'], kitchen: ['Cozinha', 'gray']
};
const PERMS = {
  admin: 'Acesso total', manager: 'Gestão, relatórios, cadastros',
  cashier: 'PDV, caixa, comandas', waiter: 'Mesas, comandas, garçom mobile', kitchen: 'KDS'
};

export default function Funcionarios() {
  const [list, setList] = useState(null);
  useEffect(() => { api.get('/employees').then(setList); }, []);
  if (!list) return <Loading />;

  return (
    <>
      <PageHead title="Funcionários" subtitle="Cadastro, perfis de acesso e comissão" />
      <Note>Controle de acesso por perfil (RBAC). Cada perfil libera apenas os módulos correspondentes — a base já valida o login via JWT.</Note>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Permissões</th><th className="right">Comissão</th><th>Status</th></tr></thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 700 }}>{u.name}</td>
                <td className="muted">{u.email}</td>
                <td><span className={'badge ' + (ROLES[u.role]?.[1] || 'gray')}>{ROLES[u.role]?.[0] || u.role}</span></td>
                <td className="muted" style={{ fontSize: 13 }}>{PERMS[u.role] || '—'}</td>
                <td className="right">{u.commission_pct > 0 ? `${u.commission_pct}%` : '—'}</td>
                <td>{u.active ? <span className="badge green">Ativo</span> : <span className="badge gray">Inativo</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
