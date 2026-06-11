import { useState } from 'react';
import { api, auth } from '../api.js';
import { UtensilsCrossed, Mail, Lock, Eye, EyeOff, ShoppingCart, Grid3x3, ChefHat, Building2, ArrowRight } from 'lucide-react';

const FEATURES = [
  { icon: ShoppingCart, title: 'PDV & Caixa', desc: 'Vendas, sangrias e fechamento de caixa' },
  { icon: Grid3x3, title: 'Mesas & Comandas', desc: 'Pedido na palma da mão, em tempo real' },
  { icon: ChefHat, title: 'Cozinha (KDS)', desc: 'Produção organizada por setor' },
  { icon: Building2, title: 'Multiempresa', desc: 'Plataforma SaaS pronta para escalar' },
];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('123456');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { token, user } = await api.post('/auth/login', { email, password });
      auth.set(token, user);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="login-page">
      <aside className="login-aside">
        <div className="brand"><span className="logo"><UtensilsCrossed size={20} color="#fff" /></span> FoodDanilo</div>
        <div className="aside-content">
          <h1>Gestão completa para o seu bar ou restaurante</h1>
          <p>Do atendimento na mesa ao financeiro — tudo num só lugar, rodando em qualquer dispositivo.</p>
          <div className="aside-features">
            {FEATURES.map((f, i) => (
              <div className="aside-feature" key={i}>
                <span className="af-ico"><f.icon size={18} /></span>
                <div><strong>{f.title}</strong><span>{f.desc}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="aside-foot">© {new Date().getFullYear()} FoodDanilo · Sistema SaaS para Bares e Restaurantes</div>
      </aside>

      <main className="login-panel">
        <form className="login-box" onSubmit={submit}>
          <div className="brand mobile-brand"><span className="logo"><UtensilsCrossed size={20} color="#fff" /></span> FoodDanilo</div>
          <h2>Bem-vindo de volta 👋</h2>
          <p className="muted mb">Acesse o painel da sua empresa</p>

          {error && <div className="error-msg">{error}</div>}

          <div className="form-row">
            <label>E-mail</label>
            <div className="field">
              <Mail size={17} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com" autoFocus />
            </div>
          </div>

          <div className="form-row">
            <label>Senha</label>
            <div className="field">
              <Lock size={17} />
              <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              <button type="button" className="pw-toggle" onClick={() => setShow(s => !s)} tabIndex={-1} aria-label="Mostrar senha">
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary login-submit" disabled={loading}>
            {loading ? 'Entrando…' : <>Entrar <ArrowRight size={17} /></>}
          </button>

          <div className="login-hint"><strong>Painel SaaS:</strong> admin@admin.com · 123456</div>
        </form>
      </main>
    </div>
  );
}
