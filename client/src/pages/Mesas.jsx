import { useEffect, useState } from 'react';
import { api, brl } from '../api.js';
import { Modal, Loading } from '../components/ui.jsx';
import ProductPicker from '../components/ProductPicker.jsx';
import PaymentModal from '../components/PaymentModal.jsx';
import { Plus, Users, Search, ChevronLeft, Trash2, Printer, Bell } from 'lucide-react';

const STATUS = {
  free: { label: 'Livre', badge: 'green' },
  occupied: { label: 'Ocupada', badge: 'red' },
  reserved: { label: 'Reservada', badge: 'blue' },
};
const ITEM_ST = { received: ['Recebido', 'blue'], preparing: ['Preparando', 'yellow'], ready: ['Pronto', 'green'], delivered: ['Entregue', 'gray'], cancelled: ['Cancelado', 'red'] };

export default function Mesas() {
  const [tables, setTables] = useState(null);
  const [products, setProducts] = useState([]);
  const [sheet, setSheet] = useState(null);   // { table, mode: 'actions'|'order'|'menu'|'pay', order }
  const [adding, setAdding] = useState(null);
  const [pickComanda, setPickComanda] = useState(false);
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('todos');

  const load = () => api.get('/tables').then(setTables);
  useEffect(() => { load(); api.get('/products').then(setProducts); }, []);

  async function openSheet(t) {
    if (t.order_id) {
      const order = await api.get('/orders/' + t.order_id);
      setSheet({ table: t, mode: 'order', order });
    } else {
      setSheet({ table: t, mode: 'actions' });
    }
  }
  async function refreshOrder(orderId) {
    const order = await api.get('/orders/' + orderId);
    setSheet(s => ({ ...s, order }));
    load();
  }
  async function openOrder(t) {
    const o = await api.post('/orders', { type: 'mesa', table_id: t.id });
    const order = await api.get('/orders/' + o.id);
    setPickComanda(false);
    setSheet({ table: t, mode: 'order', order });
    load();
  }
  async function launchItems(cart) {
    for (const i of cart) {
      await api.post(`/orders/${sheet.order.id}/items`, { product_id: i.id, qty: i.qty, notes: i.notes });
    }
    const order = await api.get('/orders/' + sheet.order.id);
    setSheet(s => ({ ...s, order, mode: 'order' }));
    load();
  }
  async function cancelItem(it) {
    await api.put('/order-items/' + it.id, { status: 'cancelled' });
    refreshOrder(sheet.order.id);
  }
  async function setStatus(t, status) { await api.put('/tables/' + t.id, { status }); setSheet(null); load(); }
  async function closeConta(payments) {
    await api.post(`/orders/${sheet.order.id}/close`, { payments });
    setSheet(null); load();
  }
  async function addTable() {
    await api.post('/tables', { number: adding.number, seats: Number(adding.seats) || 4, area: adding.area });
    setAdding(null); load();
  }

  if (!tables) return <Loading />;
  const counts = tables.reduce((a, t) => (a[t.status] = (a[t.status] || 0) + 1, a), {});
  const areas = [...new Set(tables.map(t => t.area))];
  const filtered = tables.filter(t =>
    (area === 'todos' || t.area === area) &&
    (!search || String(t.number).toLowerCase().includes(search.toLowerCase())));
  const freeTables = tables.filter(t => t.status === 'free');

  return (
    <>
      <div className="page-head">
        <h2>Painel de Mesas</h2>
        <div className="legend">
          <span className="pill green">Livre {counts.free || 0}</span>
          <span className="pill red">Ocupada {counts.occupied || 0}</span>
          <span className="pill blue">Reservada {counts.reserved || 0}</span>
        </div>
        <div className="spacer" />
        <button className="btn" onClick={() => setAdding({ number: '', seats: 4, area: 'Salão' })}><Plus size={16} /> Mesa</button>
        <button className="btn btn-primary" onClick={() => setPickComanda(true)}><Plus size={16} /> Comanda</button>
      </div>

      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input placeholder="Buscar por nº, nome do cliente ou comanda" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={area} onChange={e => setArea(e.target.value)}>
          <option value="todos">Todos os ambientes</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="tables-grid">
        {filtered.map(t => (
          <div key={t.id} className={'table-card ' + t.status} onClick={() => openSheet(t)}>
            <span className={'badge ' + STATUS[t.status].badge} style={{ alignSelf: 'flex-start' }}>{STATUS[t.status].label}</span>
            <div className="tnum">Mesa {t.number}</div>
            <div className="tinfo"><Users size={12} style={{ verticalAlign: -2 }} /> {t.seats} · {t.area}</div>
            {t.total > 0 && <div style={{ fontWeight: 800, color: 'var(--primary)', marginTop: 6 }}>{brl(t.total)}</div>}
          </div>
        ))}
        {filtered.length === 0 && <div className="muted">Nenhuma mesa encontrada.</div>}
      </div>

      {/* ───── Folha da mesa / comanda (responsivo) ───── */}
      {sheet && sheet.mode === 'actions' && (
        <Modal title={`Mesa ${sheet.table.number}`} onClose={() => setSheet(null)}>
          <div className="flex between mb">
            <span className={'badge ' + STATUS[sheet.table.status].badge}>{STATUS[sheet.table.status].label}</span>
            <span className="muted">{sheet.table.seats} lugares · {sheet.table.area}</span>
          </div>
          <div className="grid cols-2">
            {sheet.table.status === 'free' && <button className="btn btn-primary" onClick={() => openOrder(sheet.table)}>Abrir comanda</button>}
            {sheet.table.status !== 'reserved' && <button className="btn" onClick={() => setStatus(sheet.table, 'reserved')}>Reservar</button>}
            {sheet.table.status !== 'free' && <button className="btn btn-success" onClick={() => setStatus(sheet.table, 'free')}>Liberar mesa</button>}
            {sheet.table.status === 'free' && <button className="btn" onClick={() => setStatus(sheet.table, 'occupied')}>Marcar ocupada</button>}
          </div>
        </Modal>
      )}

      {sheet && sheet.mode === 'order' && (
        <Modal title={`Mesa ${sheet.table.number} · Comanda #${sheet.order.id}`} onClose={() => setSheet(null)}
          footer={<>
            <button className="btn" onClick={() => setSheet({ ...sheet, mode: 'menu' })}><Plus size={16} /> Item</button>
            <button className="btn btn-success" onClick={() => setSheet({ ...sheet, mode: 'pay' })} disabled={sheet.order.total <= 0}>Fechar conta</button>
          </>}>
          {sheet.order.items.length === 0 && <div className="empty">Nenhum item lançado. Toque em “Item” para começar.</div>}
          {sheet.order.items.map(it => (
            <div key={it.id} className="list-row" style={{ opacity: it.status === 'cancelled' ? .45 : 1 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{it.qty}× {it.name}</div>
                {it.notes && <div className="muted" style={{ fontSize: 12 }}>Obs: {it.notes}</div>}
                <span className={'badge ' + ITEM_ST[it.status][1]} style={{ marginTop: 4 }}>{ITEM_ST[it.status][0]}</span>
              </div>
              <strong>{brl(it.qty * it.price)}</strong>
              {it.status !== 'cancelled' &&
                <button className="btn btn-sm btn-ghost" onClick={() => cancelItem(it)}><Trash2 size={15} color="#f87171" /></button>}
            </div>
          ))}
          <div className="flex between mt" style={{ borderTop: '2px solid var(--border)', paddingTop: 14 }}>
            <div className="flex">
              <button className="btn btn-sm"><Printer size={15} /></button>
              <button className="btn btn-sm"><Bell size={15} /></button>
            </div>
            <div className="right"><div className="muted">Total</div><div style={{ fontSize: 24, fontWeight: 800 }}>{brl(sheet.order.total)}</div></div>
          </div>
        </Modal>
      )}

      {sheet && sheet.mode === 'menu' && (
        <Modal title={`Adicionar item · Mesa ${sheet.table.number}`} onClose={() => setSheet(null)}
          footer={<button className="btn" onClick={() => setSheet({ ...sheet, mode: 'order' })}>
            <ChevronLeft size={16} /> Voltar à comanda</button>}>
          <ProductPicker products={products} onConfirm={launchItems} />
        </Modal>
      )}

      {sheet && sheet.mode === 'pay' && (
        <PaymentModal
          title={`Fechar conta · Mesa ${sheet.table.number}`}
          total={sheet.order.total}
          onClose={() => setSheet({ ...sheet, mode: 'order' })}
          onConfirm={closeConta} />
      )}

      {/* ───── + Comanda: escolher mesa livre ───── */}
      {pickComanda && (
        <Modal title="Nova comanda" onClose={() => setPickComanda(false)}>
          <p className="muted mb">Selecione uma mesa livre:</p>
          {freeTables.length === 0 ? <div className="empty">Nenhuma mesa livre no momento.</div> : (
            <div className="tables-grid">
              {freeTables.map(t => (
                <div key={t.id} className="table-card free" onClick={() => openOrder(t)}>
                  <div className="tnum">Mesa {t.number}</div>
                  <div className="tinfo">{t.seats} lugares · {t.area}</div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* ───── + Mesa ───── */}
      {adding && (
        <Modal title="Nova mesa" onClose={() => setAdding(null)}
          footer={<>
            <button className="btn" onClick={() => setAdding(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={addTable} disabled={!adding.number}>Adicionar</button>
          </>}>
          <div className="form-row"><label>Número/identificação</label>
            <input value={adding.number} onChange={e => setAdding({ ...adding, number: e.target.value })} /></div>
          <div className="grid cols-2">
            <div className="form-row"><label>Lugares</label>
              <input type="number" value={adding.seats} onChange={e => setAdding({ ...adding, seats: e.target.value })} /></div>
            <div className="form-row"><label>Área</label>
              <input value={adding.area} onChange={e => setAdding({ ...adding, area: e.target.value })} /></div>
          </div>
        </Modal>
      )}
    </>
  );
}
