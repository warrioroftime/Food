import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, 'app.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function migrate() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    document TEXT,
    plan TEXT DEFAULT 'pro',
    max_users INTEGER DEFAULT 10,
    max_tables INTEGER DEFAULT 30,
    monthly_fee REAL DEFAULT 199.90,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'waiter',           -- admin, manager, cashier, waiter, kitchen
    commission_pct REAL DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    name TEXT NOT NULL,
    station TEXT DEFAULT 'cozinha'        -- cozinha, bar, churrasqueira, sobremesa
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    category_id INTEGER REFERENCES categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL DEFAULT 0,
    cost REAL DEFAULT 0,
    type TEXT DEFAULT 'prato',            -- bebida, prato, porcao, sobremesa, combo
    variations TEXT,                       -- JSON [{name:'G', price:..}]
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    name TEXT NOT NULL,
    unit TEXT DEFAULT 'un',               -- un, g, kg, ml, l
    stock REAL DEFAULT 0,
    min_stock REAL DEFAULT 0,
    cost REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS recipe_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id),
    qty REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER REFERENCES ingredients(id),
    type TEXT NOT NULL,                    -- entrada, saida, perda, ajuste
    qty REAL NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS restaurant_tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    number TEXT NOT NULL,
    seats INTEGER DEFAULT 4,
    area TEXT DEFAULT 'Salão',
    status TEXT DEFAULT 'free'             -- free, occupied, reserved
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    name TEXT NOT NULL,
    phone TEXT,
    cpf TEXT,
    address TEXT,
    birthday TEXT,
    loyalty_points INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    type TEXT DEFAULT 'mesa',             -- mesa, balcao, delivery
    table_id INTEGER REFERENCES restaurant_tables(id),
    customer_id INTEGER REFERENCES customers(id),
    waiter_id INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'open',           -- open, closed, cancelled
    opened_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    name TEXT NOT NULL,
    qty REAL NOT NULL DEFAULT 1,
    price REAL NOT NULL DEFAULT 0,
    notes TEXT,
    station TEXT DEFAULT 'cozinha',
    status TEXT DEFAULT 'received',        -- received, preparing, ready, delivered, cancelled
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cash_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    opened_by INTEGER REFERENCES users(id),
    opening_amount REAL DEFAULT 0,
    closing_amount REAL,
    status TEXT DEFAULT 'open',            -- open, closed
    opened_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS cash_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES cash_sessions(id),
    type TEXT NOT NULL,                    -- sangria, suprimento
    amount REAL NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id),
    session_id INTEGER REFERENCES cash_sessions(id),
    method TEXT NOT NULL,                  -- dinheiro, pix, cartao, voucher
    amount REAL NOT NULL,
    tip REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    name TEXT NOT NULL,
    phone TEXT,
    document TEXT
  );

  CREATE TABLE IF NOT EXISTS finance_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    kind TEXT NOT NULL,                    -- payable, receivable
    description TEXT NOT NULL,
    category TEXT,
    amount REAL NOT NULL,
    due_date TEXT,
    paid INTEGER DEFAULT 0,
    supplier_id INTEGER REFERENCES suppliers(id),
    customer_id INTEGER REFERENCES customers(id),
    created_at TEXT DEFAULT (datetime('now'))
  );
  `);
}
