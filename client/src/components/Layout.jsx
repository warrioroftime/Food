import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Grid3x3, ClipboardList, ChefHat,
  Bike, Package, Boxes, Users, Wallet, BarChart3, UserCog, Settings, Building2,
  Menu, LogOut, UtensilsCrossed, ChevronDown
} from 'lucide-react';
// Garçom Mobile removido: o lançamento de pedidos acontece direto nas Mesas/Comandas (responsivo)

// Top-level flat items
const TOP = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, color: '#60a5fa' },
  { to: '/mesas', label: 'Mesas', icon: Grid3x3, color: '#f87171' },
  { to: '/pdv', label: 'Caixa / PDV', icon: ShoppingCart, color: '#4ade80' },
  { to: '/comandas', label: 'Comandas', icon: ClipboardList, color: '#fbbf24' },
  { to: '/cozinha', label: 'Cozinha (KDS)', icon: ChefHat, color: '#fb923c' },
  { to: '/delivery', label: 'Delivery', icon: Bike, color: '#f472b6' },
];

// Collapsible groups
const GROUPS = [
  { title: 'Cadastros & Estoque', items: [
    { to: '/produtos', label: 'Produtos', icon: Package, color: '#34d399' },
    { to: '/estoque', label: 'Estoque', icon: Boxes, color: '#22d3ee' },
    { to: '/clientes', label: 'Clientes', icon: Users, color: '#818cf8' },
  ]},
  { title: 'Gestão', items: [
    { to: '/financeiro', label: 'Financeiro', icon: Wallet, color: '#4ade80' },
    { to: '/relatorios', label: 'Relatórios', icon: BarChart3, color: '#60a5fa' },
    { to: '/funcionarios', label: 'Funcionários', icon: UserCog, color: '#fbbf24' },
    { to: '/configuracoes', label: 'Configurações', icon: Settings, color: '#94a3b8' },
    { to: '/saas', label: 'Admin SaaS', icon: Building2, color: '#c084fc', saasOnly: true },
  ]},
];

const TITLES = Object.fromEntries(
  [...TOP, ...GROUPS.flatMap(g => g.items)].map(i => [i.to, i.label])
);

function Item({ item, sub, onNav }) {
  return (
    <NavLink to={item.to} end={item.to === '/'} onClick={onNav}
      className={({ isActive }) => 'nav-item' + (sub ? ' sub' : '') + (isActive ? ' active' : '')}>
      <span className="nav-ico" style={{ color: item.color }}><item.icon size={18} /></span>
      {item.label}
    </NavLink>
  );
}

export default function Layout({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const loc = useLocation();
  const title = TITLES[loc.pathname] || 'FoodDanilo';
  const close = () => setOpen(false);
  const toggle = (t) => setCollapsed(c => ({ ...c, [t]: !c[t] }));
  const canSee = (item) => !item.saasOnly || user.company_id === 1;

  return (
    <div className="layout">
      <div className={'backdrop' + (open ? ' show' : '')} onClick={close} />
      <aside className={'sidebar' + (open ? ' open' : '')}>
        <div className="brand">
          <span className="logo"><UtensilsCrossed size={19} color="#fff" /></span>
          FoodDanilo
        </div>

        {TOP.filter(canSee).map(item => <Item key={item.to} item={item} onNav={close} />)}

        {GROUPS.map(group => {
          const items = group.items.filter(canSee);
          if (items.length === 0) return null;
          const isOpen = !collapsed[group.title];
          return (
            <div key={group.title}>
              <button className="nav-group-head" onClick={() => toggle(group.title)}>
                {group.title}
                <ChevronDown size={14} className={'chev' + (isOpen ? ' open' : '')} />
              </button>
              {isOpen && items.map(item => <Item key={item.to} item={item} sub onNav={close} />)}
            </div>
          );
        })}

        <div style={{ flex: 1 }} />
        <button className="nav-item" onClick={onLogout} style={{ width: '100%', marginBottom: 12 }}>
          <span className="nav-ico" style={{ color: '#f87171' }}><LogOut size={18} /></span> Sair
        </button>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <h1>{title}</h1>
          <div className="spacer" />
          <div className="user">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{user.name}</div>
              <div className="muted" style={{ fontSize: 11, textTransform: 'capitalize' }}>{user.role}</div>
            </div>
            <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
