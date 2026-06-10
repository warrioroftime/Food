import { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { PageHead } from '../components/ui.jsx';
import { Clock, ChefHat, CheckCircle2, RefreshCw } from 'lucide-react';

const COLS = [
  { key: 'received', title: 'Recebido', icon: Clock, next: 'preparing', nextLabel: 'Iniciar preparo' },
  { key: 'preparing', title: 'Em preparo', icon: ChefHat, next: 'ready', nextLabel: 'Marcar pronto' },
  { key: 'ready', title: 'Pronto', icon: CheckCircle2, next: 'delivered', nextLabel: 'Entregar' },
];

function elapsed(ts) {
  const min = Math.floor((Date.now() - new Date(ts.replace(' ', 'T') + 'Z').getTime()) / 60000);
  return isNaN(min) ? '' : `${Math.max(0, min)} min`;
}

export default function Cozinha() {
  const [items, setItems] = useState([]);
  const [station, setStation] = useState('todos');

  const load = useCallback(() => api.get('/kitchen').then(setItems).catch(() => {}), []);
  useEffect(() => {
    load();
    const t = setInterval(load, 8000); // auto-refresh KDS
    return () => clearInterval(t);
  }, [load]);

  async function advance(it, status) {
    await api.put('/kitchen/items/' + it.id, { status });
    load();
  }

  const stations = ['todos', ...new Set(items.map(i => i.station))];
  const filtered = station === 'todos' ? items : items.filter(i => i.station === station);

  return (
    <>
      <PageHead title="Cozinha (KDS)" subtitle="Painel de produção — atualiza automaticamente a cada 8s">
        <button className="btn" onClick={load}><RefreshCw size={16} /> Atualizar</button>
      </PageHead>

      <div className="tabs">
        {stations.map(s => (
          <button key={s} className={'tab' + (station === s ? ' active' : '')} style={{ textTransform: 'capitalize' }}
            onClick={() => setStation(s)}>{s}</button>
        ))}
      </div>

      <div className="kds-cols">
        {COLS.map(col => {
          const list = filtered.filter(i => i.status === col.key);
          return (
            <div className="kds-col" key={col.key}>
              <h3><col.icon size={16} /> {col.title} <span className="badge gray">{list.length}</span></h3>
              {list.length === 0 && <div className="muted" style={{ fontSize: 13 }}>—</div>}
              {list.map(it => (
                <div key={it.id} className={'kds-ticket ' + col.key}>
                  <div className="flex between">
                    <strong>{it.qty}× {it.name}</strong>
                    <span className="badge gray"><Clock size={11} /> {elapsed(it.created_at)}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12, margin: '4px 0 10px' }}>
                    {it.order_type === 'mesa' ? `Mesa ${it.table_number}` : it.order_type} · {it.station}
                    {it.notes ? ` · Obs: ${it.notes}` : ''}
                  </div>
                  <button className="btn btn-sm btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => advance(it, col.next)}>{col.nextLabel}</button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
