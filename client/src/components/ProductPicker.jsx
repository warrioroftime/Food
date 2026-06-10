import { useState, useMemo } from 'react';
import { brl } from '../api.js';
import { Search, Plus, Minus, Trash2, Send } from 'lucide-react';

// Seletor de produtos com abas por grupo + busca + carrinho visível.
// Os itens só são lançados (onConfirm) quando o usuário confirma.
export default function ProductPicker({ products, onConfirm, confirmLabel = 'Lançar pedido' }) {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('todos');
  const [cart, setCart] = useState([]); // [{ id, name, price, qty, notes }]

  const groups = useMemo(() => {
    const set = [];
    for (const p of products) {
      const g = p.category_name || 'Sem grupo';
      if (!set.includes(g)) set.push(g);
    }
    return set.sort();
  }, [products]);

  const filtered = products.filter(p => p.active &&
    (group === 'todos' || (p.category_name || 'Sem grupo') === group) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase())));

  function add(p) {
    setCart(c => {
      const ex = c.find(i => i.id === p.id);
      if (ex) return c.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { id: p.id, name: p.name, price: p.price, qty: 1, notes: '' }];
    });
  }
  const setQty = (id, d) => setCart(c => c.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i));
  const setNote = (id, notes) => setCart(c => c.map(i => i.id === id ? { ...i, notes } : i));
  const remove = (id) => setCart(c => c.filter(i => i.id !== id));

  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <div className="picker">
      <div className="search mb">
        <Search size={16} />
        <input placeholder="Buscar produto…" value={search} autoFocus onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="chip-row">
        <button className={'chip' + (group === 'todos' ? ' active' : '')} onClick={() => setGroup('todos')}>
          Todos <span className="chip-count">{products.filter(p => p.active).length}</span>
        </button>
        {groups.map(g => {
          const n = products.filter(p => p.active && (p.category_name || 'Sem grupo') === g).length;
          return (
            <button key={g} className={'chip' + (group === g ? ' active' : '')} onClick={() => setGroup(g)}>
              {g} <span className="chip-count">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="prod-grid picker-grid mt">
        {filtered.map(p => {
          const inCart = cart.find(i => i.id === p.id);
          return (
            <button className={'prod-tile' + (inCart ? ' picked' : '')} key={p.id} onClick={() => add(p)}>
              {inCart && <span className="tile-qty">{inCart.qty}</span>}
              <div className="pname">{p.name}</div>
              {p.category_name && <div className="ptag">{p.category_name}</div>}
              <div className="pprice">{brl(p.price)}</div>
            </button>
          );
        })}
        {filtered.length === 0 && <div className="muted" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 20 }}>Nenhum produto encontrado.</div>}
      </div>

      {/* ───── Carrinho do pedido (visível antes de lançar) ───── */}
      <div className="cart">
        <div className="flex between mb">
          <strong>Pedido atual {count > 0 && <span className="badge gray">{count} item(ns)</span>}</strong>
          {cart.length > 0 && <button className="btn btn-sm btn-ghost" onClick={() => setCart([])}>Limpar</button>}
        </div>

        {cart.length === 0
          ? <div className="cart-empty">Toque nos produtos acima para montar o pedido. Você confere tudo aqui antes de enviar.</div>
          : cart.map(i => (
            <div className="cart-line" key={i.id}>
              <div className="qty-step">
                <button onClick={() => setQty(i.id, -1)}><Minus size={14} /></button>
                <span>{i.qty}</span>
                <button onClick={() => setQty(i.id, +1)}><Plus size={14} /></button>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{i.name}</div>
                <input className="note-input" placeholder="Observação (ex: sem cebola)"
                  value={i.notes} onChange={e => setNote(i.id, e.target.value)} />
              </div>
              <strong style={{ whiteSpace: 'nowrap' }}>{brl(i.qty * i.price)}</strong>
              <button className="btn btn-sm btn-ghost" onClick={() => remove(i.id)}><Trash2 size={15} color="#f87171" /></button>
            </div>
          ))}

        <div className="cart-bar">
          <div><div className="muted" style={{ fontSize: 12 }}>Total do pedido</div><strong style={{ fontSize: 20 }}>{brl(total)}</strong></div>
          <button className="btn btn-primary" disabled={cart.length === 0} onClick={() => { onConfirm(cart); setCart([]); }}>
            <Send size={16} /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
