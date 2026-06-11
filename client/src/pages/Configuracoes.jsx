import { useState } from 'react';
import { PageHead, Note } from '../components/ui.jsx';
import { Save, Store, Printer, Bell, QrCode } from 'lucide-react';

export default function Configuracoes() {
  const [cfg, setCfg] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fd_cfg')) || {}; } catch { return {}; }
  });
  const [saved, setSaved] = useState(false);
  const set = (k, v) => { setCfg(c => ({ ...c, [k]: v })); setSaved(false); };
  const save = () => { localStorage.setItem('fd_cfg', JSON.stringify(cfg)); setSaved(true); };

  return (
    <>
      <PageHead title="Configurações" subtitle="Dados do estabelecimento, impressão e integrações">
        <button className="btn btn-primary" onClick={save}><Save size={16} /> {saved ? 'Salvo!' : 'Salvar'}</button>
      </PageHead>
      <Note>Preferências salvas localmente nesta demonstração. Numa instalação real ficam vinculadas ao <code>company_id</code> da empresa (multiempresa).</Note>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <strong className="flex" style={{ gap: 8 }}><Store size={18} /> Estabelecimento</strong>
          <div className="form-row mt"><label>Nome fantasia</label>
            <input value={cfg.name || 'Bar do Danilo'} onChange={e => set('name', e.target.value)} /></div>
          <div className="form-row"><label>CNPJ</label>
            <input value={cfg.cnpj || '12.345.678/0001-90'} onChange={e => set('cnpj', e.target.value)} /></div>
          <div className="form-row"><label>Telefone / WhatsApp</label>
            <input value={cfg.phone || '(11) 3000-0000'} onChange={e => set('phone', e.target.value)} /></div>
          <div className="form-row"><label>Taxa de serviço (gorjeta sugerida %)</label>
            <input type="number" value={cfg.service ?? 10} onChange={e => set('service', e.target.value)} /></div>
        </div>

        <div className="grid" style={{ gap: 16 }}>
          <div className="card card-pad">
            <strong className="flex" style={{ gap: 8 }}><Printer size={18} /> Impressão</strong>
            <p className="muted" style={{ fontSize: 12, margin: '4px 0 2px' }}>Cada produto define sua impressora (Cozinha ou Caixa/Bar) no cadastro de Produtos.</p>
            <label className="flex mt" style={{ gap: 8 }}><input type="checkbox" style={{ width: 'auto' }} checked={cfg.printKitchen ?? true} onChange={e => set('printKitchen', e.target.checked)} /> Impressão automática na cozinha</label>
            <label className="flex mt" style={{ gap: 8 }}><input type="checkbox" style={{ width: 'auto' }} checked={cfg.printBar ?? true} onChange={e => set('printBar', e.target.checked)} /> Impressão automática no caixa / bar</label>
          </div>
          <div className="card card-pad">
            <strong className="flex" style={{ gap: 8 }}><Bell size={18} /> Notificações & Integrações</strong>
            <label className="flex mt" style={{ gap: 8 }}><input type="checkbox" style={{ width: 'auto' }} checked={cfg.whatsapp ?? true} onChange={e => set('whatsapp', e.target.checked)} /> Integração WhatsApp (delivery)</label>
            <label className="flex mt" style={{ gap: 8 }}><input type="checkbox" style={{ width: 'auto' }} checked={cfg.qr ?? true} onChange={e => set('qr', e.target.checked)} /> <QrCode size={15} /> QR Code na mesa (cardápio digital)</label>
          </div>
        </div>
      </div>
    </>
  );
}
