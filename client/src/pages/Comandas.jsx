import { useEffect, useState } from 'react';
import { api, brl } from '../api.js';
import { PageHead, Modal, Loading } from '../components/ui.jsx';
import ProductPicker from '../components/ProductPicker.jsx';
import PaymentModal from '../components/PaymentModal.jsx';
import { Plus, Trash2, Printer } from 'lucide-react';

const ST = { received: ['Recebido', 'blue'], preparing: ['Preparando', 'yellow'], ready: ['Pronto', 'green'], delivered: ['Entregue', 'gray'], cancelled: ['Cancelado', 'red'] };

export default function Comandas() {
  const [orders, setOrders] = useState(null);
  const [sel, setSel] = useState(null);
  const [products, setProducts] = useState([]);
  const [picker, setPicker] = useState(false);
  const [closing, setClosing] = useState(null);

  const loadList = () => api.get('/orders').then(setOrders);
  const loadSel = (id) => api.get('/orders/' + id).then(setSel);
  useEffect(() => { loadList(); api.get('/products').then(setProducts); }, []);

  async function launchItems(cart) {
    for (const i of cart) {
      await api.post(`/orders/${sel.id}/items`, { product_id: i.id, qty: i.qty, notes: i.notes });
    }
    setPicker(false); loadSel(sel.id); loadList();
  }
  async function cancelItem(it) {
    await api.put('/order-items/' + it.id, { status: 'cancelled' });
    loadSel(sel.id); loadList();
  }
  async function doClose(payments) {
    await api.post(`/orders/${sel.id}/close`, { payments });
    setClosing(null); setSel(null); loadList();
  }

  if (!orders) return <Loading />;

  return (
    <>
      <PageHead title="Comandas" subtitle="Pedidos abertos — lance itens e feche a conta" />
      <div className="grid" style={{ gridTemplateColumns: '320px 1fr', alignItems: 'start' }}>
        <div className="card card-pad">
          <strong>Abertas ({orders.length})</strong>
          <div className="mt">
            {orders.length === 0 && <div className="muted">Nenhuma comanda aberta.</div>}
            {orders.map(o => (
              <div key={o.id} className="list-row" style={{ cursor: 'pointer', background: sel?.id === o.id ? 'var(--surface-2)' : '' }}
                onClick={() => loadSel(o.id)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>
                    {o.type === 'mesa' ? `Mesa ${o.table_number}` : o.type === 'delivery' ? 'Delivery' : 'Balcão'} · #{o.id}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>{o.waiter_name || '—'}</div>
                </div>
                <strong style={{ color: '#ff5a1f' }}>{brl(o.total)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          {!sel ? <div className="empty">Selecione uma comanda à esquerda para ver os detalhes.</div> : (
            <>
              <div className="flex between mb">
                <div>
                  <strong style={{ fontSize: 18 }}>{sel.type === 'mesa' ? `Mesa ${sel.table_number}` : sel.type} · Comanda #{sel.id}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>Garçom: {sel.waiter_name || '—'}</div>
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => setPicker(true)}><Plus size={16} /> Item</button>
              </div>
              <table>
                <thead><tr><th>Item</th><th>Qtd</th><th>Status</th><th className="right">Total</th><th></th></tr></thead>
                <tbody>
                  {sel.items.map(it => (
                    <tr key={it.id} style={{ opacity: it.status === 'cancelled' ? .45 : 1 }}>
                      <td>{it.name}{it.notes && <div className="muted" style={{ fontSize: 12 }}>Obs: {it.notes}</div>}</td>
                      <td>{it.qty}</td>
                      <td><span className={'badge ' + ST[it.status][1]}>{ST[it.status][0]}</span></td>
                      <td className="right">{brl(it.qty * it.price)}</td>
                      <td className="right">{it.status !== 'cancelled' &&
                        <button className="btn btn-sm btn-ghost" onClick={() => cancelItem(it)}><Trash2 size={15} color="#dc2626" /></button>}</td>
                    </tr>
                  ))}
                  {sel.items.length === 0 && <tr><td colSpan="5" className="muted">Nenhum item lançado.</td></tr>}
                </tbody>
              </table>
              <div className="flex between mt" style={{ borderTop: '2px solid var(--border)', paddingTop: 14 }}>
                <button className="btn"><Printer size={16} /> Imprimir</button>
                <div className="right">
                  <div className="muted">Total da comanda</div>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>{brl(sel.total)}</div>
                </div>
              </div>
              <button className="btn btn-success mt" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setClosing(sel)} disabled={sel.total <= 0}>Fechar conta</button>
            </>
          )}
        </div>
      </div>

      {picker && (
        <Modal title="Adicionar item" onClose={() => setPicker(false)}>
          <ProductPicker products={products} onConfirm={launchItems} />
        </Modal>
      )}

      {closing && (
        <PaymentModal
          title={`Fechar comanda #${closing.id}`}
          total={closing.total}
          onClose={() => setClosing(null)}
          onConfirm={doClose} />
      )}
    </>
  );
}
