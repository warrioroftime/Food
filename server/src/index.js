import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { db, migrate } from './db.js';
import { signToken, authRequired } from './auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
migrate();

const app = express();
app.use(cors());
app.use(express.json());

const all = (sql, ...p) => db.prepare(sql).all(...p);
const get = (sql, ...p) => db.prepare(sql).get(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);
const cid = (req) => req.user.company_id;
const SAAS_OWNER_ID = 1; // empresa dona da plataforma (acesso ao painel Admin SaaS)
// O acesso ao painel SaaS é controlado pela flag is_saas do token (preservada
// mesmo quando o dono da plataforma "entra" num cliente para ver o sistema).
const saasOnly = (req, res, next) =>
  req.user.is_saas ? next() : res.status(403).json({ error: 'Acesso restrito ao administrador do SaaS' });

// ───────────────────────── AUTH ─────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = get('SELECT * FROM users WHERE email = ? AND active = 1', email);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash))
    return res.status(401).json({ error: 'E-mail ou senha inválidos' });
  const is_saas = user.company_id === SAAS_OWNER_ID;
  res.json({
    token: signToken(user, { is_saas }),
    user: { id: user.id, name: user.name, role: user.role, company_id: user.company_id, is_saas }
  });
});

app.get('/api/auth/me', authRequired, (req, res) => res.json(req.user));

// Everything below requires auth
app.use('/api', authRequired);

// ───────────────────────── DASHBOARD ─────────────────────────
app.get('/api/dashboard', (req, res) => {
  const c = cid(req);
  const today = new Date().toISOString().slice(0, 10);
  const salesToday = get(
    `SELECT COALESCE(SUM(amount),0) v, COUNT(*) n FROM payments
     WHERE date(created_at)=? AND order_id IN (SELECT id FROM orders WHERE company_id=?)`, today, c);
  const openOrders = get(`SELECT COUNT(*) n FROM orders WHERE company_id=? AND status='open'`, c);
  const openValue = get(
    `SELECT COALESCE(SUM(oi.qty*oi.price),0) v FROM order_items oi
     JOIN orders o ON o.id=oi.order_id WHERE o.company_id=? AND o.status='open' AND oi.status!='cancelled'`, c);
  const tables = get(`SELECT
      SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) occupied,
      SUM(CASE WHEN status='free' THEN 1 ELSE 0 END) free,
      SUM(CASE WHEN status='reserved' THEN 1 ELSE 0 END) reserved,
      COUNT(*) total FROM restaurant_tables WHERE company_id=?`, c);
  const lowStock = get(`SELECT COUNT(*) n FROM ingredients WHERE company_id=? AND stock <= min_stock`, c);
  const topProducts = all(
    `SELECT oi.name, SUM(oi.qty) qty, SUM(oi.qty*oi.price) total
     FROM order_items oi JOIN orders o ON o.id=oi.order_id
     WHERE o.company_id=? AND oi.status!='cancelled'
     GROUP BY oi.name ORDER BY qty DESC LIMIT 5`, c);
  const ticket = salesToday.n > 0 ? salesToday.v / salesToday.n : 0;
  // fake-ish weekly sales for chart (based on open value distributed)
  const week = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d, i) => ({
    day: d, total: Math.round((openValue.v + 1500) * (0.6 + 0.5 * Math.sin(i)) )
  }));
  res.json({ salesToday: salesToday.v, ordersToday: salesToday.n, openOrders: openOrders.n,
    openValue: openValue.v, tables, lowStock: lowStock.n, ticket, topProducts, week });
});

// ───────────────────────── CATEGORIES / PRODUCTS ─────────────────────────
app.get('/api/categories', (req, res) => res.json(all(
  `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) products
   FROM categories c WHERE c.company_id=? ORDER BY c.name`, cid(req))));

app.post('/api/categories', (req, res) => {
  const { name, station } = req.body;
  const r = run('INSERT INTO categories (company_id,name,station) VALUES (?,?,?)', cid(req), name, station || 'cozinha');
  res.json(get('SELECT * FROM categories WHERE id=?', r.lastInsertRowid));
});

app.put('/api/categories/:id', (req, res) => {
  const { name, station } = req.body;
  run('UPDATE categories SET name=?, station=? WHERE id=? AND company_id=?', name, station, req.params.id, cid(req));
  res.json(get('SELECT * FROM categories WHERE id=?', req.params.id));
});

app.delete('/api/categories/:id', (req, res) => {
  run('UPDATE products SET category_id=NULL WHERE category_id=?', req.params.id);
  run('DELETE FROM categories WHERE id=? AND company_id=?', req.params.id, cid(req));
  res.json({ ok: true });
});

app.get('/api/products', (req, res) => {
  res.json(all(`SELECT p.*, c.name category_name, c.station FROM products p
    LEFT JOIN categories c ON c.id=p.category_id WHERE p.company_id=? ORDER BY p.name`, cid(req)));
});

app.get('/api/products/:id', (req, res) => {
  const p = get('SELECT * FROM products WHERE id=? AND company_id=?', req.params.id, cid(req));
  if (!p) return res.status(404).json({ error: 'Produto não encontrado' });
  p.recipe = all(`SELECT ri.*, i.name, i.unit FROM recipe_items ri
    JOIN ingredients i ON i.id=ri.ingredient_id WHERE ri.product_id=?`, p.id);
  res.json(p);
});

app.post('/api/products', (req, res) => {
  const { name, description, price, cost, type, category_id, variations, print_target } = req.body;
  const printer = print_target === 'bar' ? 'bar' : 'cozinha';
  const r = run(`INSERT INTO products (company_id,category_id,name,description,price,cost,type,variations,print_target)
    VALUES (?,?,?,?,?,?,?,?,?)`, cid(req), category_id || null, name, description || '', price || 0,
    cost || 0, type || 'prato', variations ? JSON.stringify(variations) : null, printer);
  res.json(get('SELECT * FROM products WHERE id=?', r.lastInsertRowid));
});

app.put('/api/products/:id', (req, res) => {
  const { name, description, price, cost, type, category_id, active, print_target } = req.body;
  const printer = print_target === 'bar' ? 'bar' : 'cozinha';
  run(`UPDATE products SET name=?,description=?,price=?,cost=?,type=?,category_id=?,print_target=?,active=?
    WHERE id=? AND company_id=?`, name, description, price, cost, type, category_id || null,
    printer, active ? 1 : 0, req.params.id, cid(req));
  res.json(get('SELECT * FROM products WHERE id=?', req.params.id));
});

app.delete('/api/products/:id', (req, res) => {
  run('DELETE FROM products WHERE id=? AND company_id=?', req.params.id, cid(req));
  res.json({ ok: true });
});

// ───────────────────────── INGREDIENTS / STOCK ─────────────────────────
app.get('/api/ingredients', (req, res) =>
  res.json(all('SELECT * FROM ingredients WHERE company_id=? ORDER BY name', cid(req))));

app.post('/api/ingredients', (req, res) => {
  const { name, unit, stock, min_stock, cost } = req.body;
  const r = run('INSERT INTO ingredients (company_id,name,unit,stock,min_stock,cost) VALUES (?,?,?,?,?,?)',
    cid(req), name, unit || 'un', stock || 0, min_stock || 0, cost || 0);
  res.json(get('SELECT * FROM ingredients WHERE id=?', r.lastInsertRowid));
});

app.post('/api/stock/movement', (req, res) => {
  const { ingredient_id, type, qty, note } = req.body;
  const delta = type === 'entrada' ? Math.abs(qty) : -Math.abs(qty);
  run('UPDATE ingredients SET stock = stock + ? WHERE id=? AND company_id=?', delta, ingredient_id, cid(req));
  run('INSERT INTO stock_movements (ingredient_id,type,qty,note) VALUES (?,?,?,?)', ingredient_id, type, qty, note || '');
  res.json(get('SELECT * FROM ingredients WHERE id=?', ingredient_id));
});

// ───────────────────────── TABLES ─────────────────────────
app.get('/api/tables', (req, res) => {
  const rows = all(`SELECT t.*,
      (SELECT o.id FROM orders o WHERE o.table_id=t.id AND o.status='open' LIMIT 1) order_id,
      (SELECT COALESCE(SUM(oi.qty*oi.price),0) FROM order_items oi JOIN orders o ON o.id=oi.order_id
        WHERE o.table_id=t.id AND o.status='open' AND oi.status!='cancelled') total
    FROM restaurant_tables t WHERE t.company_id=? ORDER BY CAST(t.number AS INTEGER)`, cid(req));
  res.json(rows);
});

app.put('/api/tables/:id', (req, res) => {
  const { status, number, seats, area } = req.body;
  const t = get('SELECT * FROM restaurant_tables WHERE id=? AND company_id=?', req.params.id, cid(req));
  if (!t) return res.status(404).json({ error: 'Mesa não encontrada' });
  run('UPDATE restaurant_tables SET status=?,number=?,seats=?,area=? WHERE id=?',
    status || t.status, number || t.number, seats || t.seats, area || t.area, t.id);
  res.json(get('SELECT * FROM restaurant_tables WHERE id=?', t.id));
});

app.post('/api/tables', (req, res) => {
  const company = get('SELECT max_tables FROM companies WHERE id=?', cid(req));
  const count = get('SELECT COUNT(*) n FROM restaurant_tables WHERE company_id=?', cid(req)).n;
  if (company && count >= company.max_tables)
    return res.status(403).json({ error: `Limite do plano atingido: máximo de ${company.max_tables} mesas. Faça upgrade do plano.` });
  const { number, seats, area } = req.body;
  const r = run('INSERT INTO restaurant_tables (company_id,number,seats,area) VALUES (?,?,?,?)',
    cid(req), number, seats || 4, area || 'Salão');
  res.json(get('SELECT * FROM restaurant_tables WHERE id=?', r.lastInsertRowid));
});

// ───────────────────────── CUSTOMERS ─────────────────────────
app.get('/api/customers', (req, res) =>
  res.json(all('SELECT * FROM customers WHERE company_id=? ORDER BY name', cid(req))));

app.post('/api/customers', (req, res) => {
  const { name, phone, cpf, address, birthday } = req.body;
  const r = run('INSERT INTO customers (company_id,name,phone,cpf,address,birthday) VALUES (?,?,?,?,?,?)',
    cid(req), name, phone || '', cpf || '', address || '', birthday || '');
  res.json(get('SELECT * FROM customers WHERE id=?', r.lastInsertRowid));
});

app.put('/api/customers/:id', (req, res) => {
  const { name, phone, cpf, address, birthday } = req.body;
  run('UPDATE customers SET name=?,phone=?,cpf=?,address=?,birthday=? WHERE id=? AND company_id=?',
    name, phone, cpf, address, birthday, req.params.id, cid(req));
  res.json(get('SELECT * FROM customers WHERE id=?', req.params.id));
});

app.delete('/api/customers/:id', (req, res) => {
  run('DELETE FROM customers WHERE id=? AND company_id=?', req.params.id, cid(req));
  res.json({ ok: true });
});

// ───────────────────────── ORDERS (COMANDAS) ─────────────────────────
app.get('/api/orders', (req, res) => {
  const rows = all(`SELECT o.*, t.number table_number, u.name waiter_name, cu.name customer_name,
      (SELECT COALESCE(SUM(oi.qty*oi.price),0) FROM order_items oi
        WHERE oi.order_id=o.id AND oi.status!='cancelled') total
    FROM orders o
    LEFT JOIN restaurant_tables t ON t.id=o.table_id
    LEFT JOIN users u ON u.id=o.waiter_id
    LEFT JOIN customers cu ON cu.id=o.customer_id
    WHERE o.company_id=? AND o.status='open' ORDER BY o.opened_at`, cid(req));
  res.json(rows);
});

app.get('/api/orders/:id', (req, res) => {
  const o = get(`SELECT o.*, t.number table_number, u.name waiter_name FROM orders o
    LEFT JOIN restaurant_tables t ON t.id=o.table_id LEFT JOIN users u ON u.id=o.waiter_id
    WHERE o.id=? AND o.company_id=?`, req.params.id, cid(req));
  if (!o) return res.status(404).json({ error: 'Comanda não encontrada' });
  o.items = all('SELECT * FROM order_items WHERE order_id=? ORDER BY created_at', o.id);
  o.total = o.items.filter(i => i.status !== 'cancelled').reduce((s, i) => s + i.qty * i.price, 0);
  res.json(o);
});

app.post('/api/orders', (req, res) => {
  const company = get('SELECT max_orders FROM companies WHERE id=?', cid(req));
  const open = get(`SELECT COUNT(*) n FROM orders WHERE company_id=? AND status='open'`, cid(req)).n;
  if (company && company.max_orders && open >= company.max_orders)
    return res.status(403).json({ error: `Limite do plano atingido: máximo de ${company.max_orders} comandas abertas ao mesmo tempo.` });
  const { type, table_id, customer_id, waiter_id } = req.body;
  const r = run('INSERT INTO orders (company_id,type,table_id,customer_id,waiter_id) VALUES (?,?,?,?,?)',
    cid(req), type || 'mesa', table_id || null, customer_id || null, waiter_id || req.user.id);
  if (table_id) run(`UPDATE restaurant_tables SET status='occupied' WHERE id=?`, table_id);
  res.json(get('SELECT * FROM orders WHERE id=?', r.lastInsertRowid));
});

app.post('/api/orders/:id/items', (req, res) => {
  const { product_id, qty, notes } = req.body;
  const p = get('SELECT p.*, c.station FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=?', product_id);
  if (!p) return res.status(404).json({ error: 'Produto não encontrado' });
  run('INSERT INTO order_items (order_id,product_id,name,qty,price,notes,station,print_target) VALUES (?,?,?,?,?,?,?,?)',
    req.params.id, p.id, p.name, qty || 1, p.price, notes || '', p.station || 'cozinha', p.print_target || 'cozinha');
  // baixa de estoque (ficha técnica)
  const recipe = all('SELECT * FROM recipe_items WHERE product_id=?', p.id);
  for (const ri of recipe) {
    run('UPDATE ingredients SET stock = stock - ? WHERE id=?', ri.qty * (qty || 1), ri.ingredient_id);
    run('INSERT INTO stock_movements (ingredient_id,type,qty,note) VALUES (?,?,?,?)',
      ri.ingredient_id, 'saida', ri.qty * (qty || 1), 'Venda: ' + p.name);
  }
  res.json({ ok: true });
});

app.put('/api/order-items/:id', (req, res) => {
  const { status, qty } = req.body;
  const it = get('SELECT * FROM order_items WHERE id=?', req.params.id);
  if (!it) return res.status(404).json({ error: 'Item não encontrado' });
  run('UPDATE order_items SET status=?, qty=? WHERE id=?', status || it.status, qty || it.qty, it.id);
  res.json({ ok: true });
});

app.post('/api/orders/:id/close', (req, res) => {
  const { payments, tip } = req.body; // payments: [{method, amount}]
  const o = get('SELECT * FROM orders WHERE id=? AND company_id=?', req.params.id, cid(req));
  if (!o) return res.status(404).json({ error: 'Comanda não encontrada' });
  const session = get(`SELECT * FROM cash_sessions WHERE company_id=? AND status='open' ORDER BY id DESC LIMIT 1`, cid(req));
  for (const p of (payments || [])) {
    run('INSERT INTO payments (order_id,session_id,method,amount,tip) VALUES (?,?,?,?,?)',
      o.id, session?.id || null, p.method, p.amount, tip || 0);
  }
  run(`UPDATE orders SET status='closed', closed_at=datetime('now') WHERE id=?`, o.id);
  if (o.table_id) run(`UPDATE restaurant_tables SET status='free' WHERE id=?`, o.table_id);
  res.json({ ok: true });
});

// ───────────────────────── KITCHEN (KDS) ─────────────────────────
app.get('/api/kitchen', (req, res) => {
  const rows = all(`SELECT oi.*, o.table_id, t.number table_number, o.type order_type
    FROM order_items oi JOIN orders o ON o.id=oi.order_id
    LEFT JOIN restaurant_tables t ON t.id=o.table_id
    WHERE o.company_id=? AND o.status='open' AND oi.status IN ('received','preparing','ready')
    ORDER BY oi.created_at`, cid(req));
  res.json(rows);
});

app.put('/api/kitchen/items/:id', (req, res) => {
  run('UPDATE order_items SET status=? WHERE id=?', req.body.status, req.params.id);
  res.json({ ok: true });
});

// ───────────────────────── CASH (PDV) ─────────────────────────
app.get('/api/cash/current', (req, res) => {
  const s = get(`SELECT * FROM cash_sessions WHERE company_id=? AND status='open' ORDER BY id DESC LIMIT 1`, cid(req));
  if (!s) return res.json({ session: null });
  const movements = all('SELECT * FROM cash_movements WHERE session_id=? ORDER BY created_at', s.id);
  const pays = all('SELECT method, SUM(amount) total, SUM(tip) tips FROM payments WHERE session_id=? GROUP BY method', s.id);
  res.json({ session: s, movements, payments: pays });
});

app.post('/api/cash/open', (req, res) => {
  const open = get(`SELECT id FROM cash_sessions WHERE company_id=? AND status='open'`, cid(req));
  if (open) return res.status(400).json({ error: 'Já existe um caixa aberto' });
  const r = run('INSERT INTO cash_sessions (company_id,opened_by,opening_amount) VALUES (?,?,?)',
    cid(req), req.user.id, req.body.opening_amount || 0);
  res.json(get('SELECT * FROM cash_sessions WHERE id=?', r.lastInsertRowid));
});

app.post('/api/cash/movement', (req, res) => {
  const { type, amount, note } = req.body;
  const s = get(`SELECT * FROM cash_sessions WHERE company_id=? AND status='open' ORDER BY id DESC LIMIT 1`, cid(req));
  if (!s) return res.status(400).json({ error: 'Nenhum caixa aberto' });
  run('INSERT INTO cash_movements (session_id,type,amount,note) VALUES (?,?,?,?)', s.id, type, amount, note || '');
  res.json({ ok: true });
});

app.post('/api/cash/close', (req, res) => {
  const s = get(`SELECT * FROM cash_sessions WHERE company_id=? AND status='open' ORDER BY id DESC LIMIT 1`, cid(req));
  if (!s) return res.status(400).json({ error: 'Nenhum caixa aberto' });
  run(`UPDATE cash_sessions SET status='closed', closing_amount=?, closed_at=datetime('now') WHERE id=?`,
    req.body.closing_amount || 0, s.id);
  res.json({ ok: true });
});

// ───────────────────────── FINANCE ─────────────────────────
app.get('/api/finance', (req, res) => {
  const entries = all('SELECT * FROM finance_entries WHERE company_id=? ORDER BY due_date', cid(req));
  const payable = entries.filter(e => e.kind === 'payable');
  const receivable = entries.filter(e => e.kind === 'receivable');
  const sum = (arr, paid) => arr.filter(e => !!e.paid === paid).reduce((s, e) => s + e.amount, 0);
  res.json({ entries,
    totals: {
      payableOpen: sum(payable, false), payablePaid: sum(payable, true),
      receivableOpen: sum(receivable, false), receivablePaid: sum(receivable, true)
    } });
});

app.post('/api/finance', (req, res) => {
  const { kind, description, category, amount, due_date } = req.body;
  const r = run('INSERT INTO finance_entries (company_id,kind,description,category,amount,due_date) VALUES (?,?,?,?,?,?)',
    cid(req), kind, description, category || '', amount, due_date || null);
  res.json(get('SELECT * FROM finance_entries WHERE id=?', r.lastInsertRowid));
});

app.put('/api/finance/:id/pay', (req, res) => {
  run('UPDATE finance_entries SET paid=1 WHERE id=? AND company_id=?', req.params.id, cid(req));
  res.json({ ok: true });
});

// ───────────────────────── EMPLOYEES ─────────────────────────
const VALID_ROLES = ['admin', 'manager', 'cashier', 'waiter', 'kitchen'];

app.get('/api/employees', (req, res) =>
  res.json(all('SELECT id,name,email,role,commission_pct,active,created_at FROM users WHERE company_id=? ORDER BY name', cid(req))));

app.post('/api/employees', (req, res) => {
  const { name, email, password, role, commission_pct } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  if (role && !VALID_ROLES.includes(role))
    return res.status(400).json({ error: 'Perfil inválido' });
  if (get('SELECT id FROM users WHERE email=?', email))
    return res.status(400).json({ error: 'Já existe um usuário com esse e-mail' });
  const company = get('SELECT max_users FROM companies WHERE id=?', cid(req));
  const count = get('SELECT COUNT(*) n FROM users WHERE company_id=?', cid(req)).n;
  if (company && company.max_users && count >= company.max_users)
    return res.status(403).json({ error: `Limite do plano atingido: máximo de ${company.max_users} usuários. Faça upgrade do plano.` });
  const r = run('INSERT INTO users (company_id,name,email,password_hash,role,commission_pct) VALUES (?,?,?,?,?,?)',
    cid(req), name, email, bcrypt.hashSync(password, 8), role || 'waiter', commission_pct || 0);
  res.json(get('SELECT id,name,email,role,commission_pct,active,created_at FROM users WHERE id=?', r.lastInsertRowid));
});

app.put('/api/employees/:id', (req, res) => {
  const u = get('SELECT * FROM users WHERE id=? AND company_id=?', req.params.id, cid(req));
  if (!u) return res.status(404).json({ error: 'Funcionário não encontrado' });
  const { name, email, password, role, commission_pct, active } = req.body || {};
  if (role && !VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Perfil inválido' });
  if (email && email !== u.email && get('SELECT id FROM users WHERE email=?', email))
    return res.status(400).json({ error: 'Já existe um usuário com esse e-mail' });
  const hash = password ? bcrypt.hashSync(password, 8) : u.password_hash;
  run('UPDATE users SET name=?,email=?,password_hash=?,role=?,commission_pct=?,active=? WHERE id=?',
    name ?? u.name, email ?? u.email, hash, role ?? u.role,
    commission_pct ?? u.commission_pct, active == null ? u.active : (active ? 1 : 0), u.id);
  res.json(get('SELECT id,name,email,role,commission_pct,active,created_at FROM users WHERE id=?', u.id));
});

// ───────────────────────── SAAS ADMIN ─────────────────────────
app.get('/api/saas/companies', saasOnly, (req, res) => {
  const rows = all(`SELECT c.*,
      (SELECT COUNT(*) FROM users u WHERE u.company_id=c.id) users,
      (SELECT COUNT(*) FROM restaurant_tables t WHERE t.company_id=c.id) tables
    FROM companies c ORDER BY c.id`);
  const mrr = rows.filter(r => r.status === 'active').reduce((s, r) => s + r.monthly_fee, 0);
  res.json({ companies: rows, mrr });
});

// Dono da plataforma "entra" num cliente para ver o sistema dele.
// Gera um token escopado para a empresa-alvo, mantendo is_saas para poder voltar.
app.post('/api/saas/enter/:id', saasOnly, (req, res) => {
  const company = get('SELECT * FROM companies WHERE id=?', req.params.id);
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
  if (company.id === SAAS_OWNER_ID) return res.status(400).json({ error: 'A própria plataforma não tem sistema operacional' });
  const me = get('SELECT * FROM users WHERE id=?', req.user.id);
  const impersonating = { id: company.id, name: company.name };
  const user = { id: me.id, name: me.name, role: me.role, company_id: company.id, is_saas: true, impersonating };
  res.json({ token: signToken({ ...me, company_id: company.id }, { is_saas: true, impersonating }), user });
});

// Volta do cliente para o painel SaaS (token de volta na empresa da plataforma).
app.post('/api/saas/exit', saasOnly, (req, res) => {
  const me = get('SELECT * FROM users WHERE id=?', req.user.id);
  const user = { id: me.id, name: me.name, role: me.role, company_id: me.company_id, is_saas: true };
  res.json({ token: signToken(me, { is_saas: true }), user });
});

// ── Usuários de cada empresa, gerenciados pelo painel SaaS ──
// A senha nunca é devolvida (fica protegida por hash); só é possível redefinir.
app.get('/api/saas/companies/:id/users', saasOnly, (req, res) => {
  const c = get('SELECT id FROM companies WHERE id=?', req.params.id);
  if (!c) return res.status(404).json({ error: 'Empresa não encontrada' });
  res.json(all('SELECT id,name,email,role,active,created_at FROM users WHERE company_id=? ORDER BY name', c.id));
});

app.post('/api/saas/companies/:id/users', saasOnly, (req, res) => {
  const c = get('SELECT * FROM companies WHERE id=?', req.params.id);
  if (!c) return res.status(404).json({ error: 'Empresa não encontrada' });
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  if (role && !VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Perfil inválido' });
  if (get('SELECT id FROM users WHERE email=?', email)) return res.status(400).json({ error: 'Já existe um usuário com esse e-mail' });
  const count = get('SELECT COUNT(*) n FROM users WHERE company_id=?', c.id).n;
  if (c.max_users && count >= c.max_users)
    return res.status(403).json({ error: `Limite do plano atingido: máximo de ${c.max_users} usuários.` });
  const r = run('INSERT INTO users (company_id,name,email,password_hash,role) VALUES (?,?,?,?,?)',
    c.id, name, email, bcrypt.hashSync(password, 8), role || 'waiter');
  res.json(get('SELECT id,name,email,role,active,created_at FROM users WHERE id=?', r.lastInsertRowid));
});

app.put('/api/saas/users/:id', saasOnly, (req, res) => {
  const u = get('SELECT * FROM users WHERE id=?', req.params.id);
  if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
  const { name, email, password, role, active } = req.body || {};
  if (role && !VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Perfil inválido' });
  if (email && email !== u.email && get('SELECT id FROM users WHERE email=?', email))
    return res.status(400).json({ error: 'Já existe um usuário com esse e-mail' });
  const hash = password ? bcrypt.hashSync(password, 8) : u.password_hash;
  run('UPDATE users SET name=?,email=?,password_hash=?,role=?,active=? WHERE id=?',
    name ?? u.name, email ?? u.email, hash, role ?? u.role, active == null ? u.active : (active ? 1 : 0), u.id);
  res.json(get('SELECT id,name,email,role,active,created_at FROM users WHERE id=?', u.id));
});

app.post('/api/saas/companies', saasOnly, (req, res) => {
  const { name, document, plan, max_users, max_tables, monthly_fee, status,
    admin_name, admin_email, admin_password } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
  if (admin_email && get('SELECT id FROM users WHERE email=?', admin_email))
    return res.status(400).json({ error: 'Já existe um usuário com esse e-mail' });
  const { max_orders, cep, logradouro, numero, bairro, municipio, uf, phone, email } = req.body;
  const r = run(`INSERT INTO companies
    (name,document,plan,max_users,max_tables,max_orders,monthly_fee,status,cep,logradouro,numero,bairro,municipio,uf,phone,email)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, name, document || '', plan || 'pro', max_users || 10,
    max_tables || 30, max_orders || 60, monthly_fee || 0, status || 'trial',
    cep || '', logradouro || '', numero || '', bairro || '', municipio || '', uf || '', phone || '', email || '');
  const companyId = r.lastInsertRowid;
  if (admin_email && admin_password) {
    run(`INSERT INTO users (company_id,name,email,password_hash,role) VALUES (?,?,?,?,?)`,
      companyId, admin_name || 'Administrador', admin_email, bcrypt.hashSync(admin_password, 8), 'admin');
  }
  res.json(get('SELECT * FROM companies WHERE id=?', companyId));
});

// Consulta de CNPJ — puxa dados da empresa automaticamente (BrasilAPI + fallback ReceitaWS)
async function fetchBrasilApi(digits) {
  const r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + digits);
  if (r.status === 404) return { notFound: true };
  if (!r.ok) throw new Error('brasilapi');
  const d = await r.json();
  return {
    razao_social: d.razao_social || '',
    nome_fantasia: d.nome_fantasia || '',
    phone: d.ddd_telefone_1 || '',
    email: d.email || '',
    cep: d.cep || '', logradouro: d.logradouro || '', numero: d.numero || '',
    bairro: d.bairro || '', municipio: d.municipio || '', uf: d.uf || '',
    situacao: d.descricao_situacao_cadastral || ''
  };
}
async function fetchReceitaWs(digits) {
  const r = await fetch('https://receitaws.com.br/v1/cnpj/' + digits);
  if (!r.ok) throw new Error('receitaws');
  const d = await r.json();
  if (d.status === 'ERROR') return { notFound: true };
  return {
    razao_social: d.nome || '',
    nome_fantasia: d.fantasia || '',
    phone: d.telefone || '',
    email: d.email || '',
    cep: d.cep || '', logradouro: d.logradouro || '', numero: d.numero || '',
    bairro: d.bairro || '', municipio: d.municipio || '', uf: d.uf || '',
    situacao: d.situacao || ''
  };
}

app.get('/api/cnpj/:cnpj', saasOnly, async (req, res) => {
  const digits = String(req.params.cnpj).replace(/\D/g, '');
  if (digits.length !== 14) return res.status(400).json({ error: 'CNPJ deve ter 14 dígitos' });
  const fmt = digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  let info;
  try {
    info = await fetchBrasilApi(digits);
  } catch {
    try { info = await fetchReceitaWs(digits); }
    catch { return res.status(502).json({ error: 'Serviços de CNPJ indisponíveis. Tente novamente.' }); }
  }
  if (info.notFound) return res.status(404).json({ error: 'CNPJ não encontrado na Receita' });
  const address = [info.logradouro, info.numero, info.bairro, info.municipio, info.uf, info.cep].filter(Boolean).join(', ');
  res.json({ document: fmt, name: info.nome_fantasia || info.razao_social || '', address, ...info });
});

app.put('/api/saas/companies/:id', saasOnly, (req, res) => {
  const c = get('SELECT * FROM companies WHERE id=?', req.params.id);
  if (!c) return res.status(404).json({ error: 'Empresa não encontrada' });
  const b = req.body;
  run(`UPDATE companies SET name=?,document=?,plan=?,max_users=?,max_tables=?,max_orders=?,monthly_fee=?,status=?,
       cep=?,logradouro=?,numero=?,bairro=?,municipio=?,uf=?,phone=?,email=? WHERE id=?`,
    b.name ?? c.name, b.document ?? c.document, b.plan ?? c.plan, b.max_users ?? c.max_users,
    b.max_tables ?? c.max_tables, b.max_orders ?? c.max_orders, b.monthly_fee ?? c.monthly_fee, b.status ?? c.status,
    b.cep ?? c.cep, b.logradouro ?? c.logradouro, b.numero ?? c.numero, b.bairro ?? c.bairro,
    b.municipio ?? c.municipio, b.uf ?? c.uf, b.phone ?? c.phone, b.email ?? c.email, c.id);
  res.json(get('SELECT * FROM companies WHERE id=?', c.id));
});

// ───────────────────────── DELIVERY (sample-backed) ─────────────────────────
app.get('/api/delivery', (req, res) => {
  res.json(all(`SELECT o.*, cu.name customer_name, cu.phone, cu.address FROM orders o
    LEFT JOIN customers cu ON cu.id=o.customer_id WHERE o.company_id=? AND o.type='delivery'`, cid(req)));
});

// ───────────────────────── Serve built client in production ─────────────────────────
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Rota não encontrada' });
    res.sendFile(join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 API FoodDanilo rodando em http://localhost:${PORT}`));
