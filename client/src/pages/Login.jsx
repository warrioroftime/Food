import { useState } from 'react';
import { api, auth } from '../api.js';
import { UtensilsCrossed } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@fooddanilo.com');
  const [password, setPassword] = useState('admin123');
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
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">
          <span className="logo"><UtensilsCrossed size={20} color="#fff" /></span>
          FoodDanilo
        </div>
        <h2>Bem-vindo de volta</h2>
        <p>Sistema de gestão para bares e restaurantes</p>
        {error && <div className="error-msg">{error}</div>}
        <div className="form-row">
          <label>E-mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        </div>
        <div className="form-row">
          <label>Senha</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <div className="login-hint">
          <strong>Demo:</strong> admin@fooddanilo.com / admin123
        </div>
      </form>
    </div>
  );
}
