import bcrypt from 'bcryptjs';
import { db, migrate } from './db.js';

migrate();

console.log('🌱 Limpando e populando o banco com dados de exemplo...');

// Wipe (respecting FK order)
const tables = [
  'payments', 'cash_movements', 'cash_sessions', 'order_items', 'orders',
  'recipe_items', 'stock_movements', 'products', 'ingredients', 'categories',
  'restaurant_tables', 'customers', 'finance_entries', 'suppliers', 'users', 'companies'
];
db.exec('PRAGMA foreign_keys = OFF;');
for (const t of tables) db.exec(`DELETE FROM ${t}; DELETE FROM sqlite_sequence WHERE name='${t}';`);
db.exec('PRAGMA foreign_keys = ON;');

// Companies — a 1ª empresa é a PLATAFORMA (dona do SaaS); as demais são clientes.
const insCompany = db.prepare(`INSERT INTO companies
  (name, document, plan, max_users, max_tables, max_orders, monthly_fee, status)
  VALUES (?,?,?,?,?,?,?,?)`);
insCompany.run('FoodDanilo · Plataforma', '00.000.000/0001-00', 'enterprise', 99, 0, 0, 0, 'active'); // id 1 = dona do SaaS
const barId = insCompany.run('Bar do Danilo', '12.345.678/0001-90', 'pro', 15, 30, 60, 199.90, 'active').lastInsertRowid;
insCompany.run('Restaurante Sabor & Arte', '98.765.432/0001-10', 'basic', 5, 12, 20, 99.90, 'active');
insCompany.run('Pizzaria Bella Massa', '11.222.333/0001-44', 'enterprise', 50, 80, 200, 499.90, 'trial');
const companyId = barId; // todos os dados de exemplo abaixo pertencem ao Bar do Danilo

// Users
const insUser = db.prepare(`INSERT INTO users (company_id, name, email, password_hash, role, commission_pct)
  VALUES (?,?,?,?,?,?)`);
// Administrador da plataforma (SaaS): vê apenas o painel SaaS e entra nos clientes a partir dele.
insUser.run(1, 'Administrador SaaS', 'admin@admin.com', bcrypt.hashSync('123456', 8), 'admin', 0);
// Equipe do Bar do Danilo (cliente)
const adminId = insUser.run(companyId, 'Danilo (Admin)', 'admin@fooddanilo.com', bcrypt.hashSync('admin123', 8), 'admin', 0).lastInsertRowid;
insUser.run(companyId, 'Marina Gerente', 'marina@fooddanilo.com', bcrypt.hashSync('123456', 8), 'manager', 0);
insUser.run(companyId, 'Carlos Caixa', 'carlos@fooddanilo.com', bcrypt.hashSync('123456', 8), 'cashier', 0);
const joaoId = insUser.run(companyId, 'João Garçom', 'joao@fooddanilo.com', bcrypt.hashSync('123456', 8), 'waiter', 10).lastInsertRowid;
insUser.run(companyId, 'Ana Garçonete', 'ana@fooddanilo.com', bcrypt.hashSync('123456', 8), 'waiter', 10);

// Categories
const insCat = db.prepare(`INSERT INTO categories (company_id, name, station) VALUES (?,?,?)`);
const catBebidas = insCat.run(companyId, 'Bebidas', 'bar').lastInsertRowid;
const catLanches = insCat.run(companyId, 'Lanches', 'cozinha').lastInsertRowid;
const catPorcoes = insCat.run(companyId, 'Porções', 'cozinha').lastInsertRowid;
const catPratos  = insCat.run(companyId, 'Pratos', 'cozinha').lastInsertRowid;
const catSobrem  = insCat.run(companyId, 'Sobremesas', 'sobremesa').lastInsertRowid;

// Ingredients (stock)
const insIng = db.prepare(`INSERT INTO ingredients (company_id, name, unit, stock, min_stock, cost) VALUES (?,?,?,?,?,?)`);
const ing = {};
ing.pao        = insIng.run(companyId, 'Pão de hambúrguer', 'un', 120, 30, 1.20).lastInsertRowid;
ing.burger     = insIng.run(companyId, 'Hambúrguer 120g', 'un', 80, 25, 3.50).lastInsertRowid;
ing.queijo     = insIng.run(companyId, 'Queijo (g)', 'g', 4000, 1000, 0.05).lastInsertRowid;
ing.molho      = insIng.run(companyId, 'Molho especial (g)', 'g', 2000, 500, 0.02).lastInsertRowid;
ing.batata     = insIng.run(companyId, 'Batata congelada (g)', 'g', 15000, 3000, 0.01).lastInsertRowid;
ing.refri      = insIng.run(companyId, 'Refrigerante lata', 'un', 200, 48, 2.50).lastInsertRowid;
ing.cerveja    = insIng.run(companyId, 'Cerveja long neck', 'un', 14, 24, 4.00).lastInsertRowid; // abaixo do mínimo!
ing.carne      = insIng.run(companyId, 'Picanha (g)', 'g', 8000, 2000, 0.08).lastInsertRowid;

// Products
const insProd = db.prepare(`INSERT INTO products (company_id, category_id, name, description, price, cost, type, variations)
  VALUES (?,?,?,?,?,?,?,?)`);
const insRec = db.prepare(`INSERT INTO recipe_items (product_id, ingredient_id, qty) VALUES (?,?,?)`);

const xburger = insProd.run(companyId, catLanches, 'X-Burguer', 'Pão, hambúrguer, queijo e molho especial', 22.90, 5.80, 'prato', null).lastInsertRowid;
insRec.run(xburger, ing.pao, 1);
insRec.run(xburger, ing.burger, 1);
insRec.run(xburger, ing.queijo, 30);
insRec.run(xburger, ing.molho, 20);

const xbacon = insProd.run(companyId, catLanches, 'X-Bacon Duplo', 'Dois hambúrgueres, bacon e queijo', 32.90, 9.40, 'prato', null).lastInsertRowid;
insRec.run(xbacon, ing.pao, 1);
insRec.run(xbacon, ing.burger, 2);
insRec.run(xbacon, ing.queijo, 40);

const fritas = insProd.run(companyId, catPorcoes, 'Batata Frita', 'Porção de batata frita crocante', 24.90, 4.50, 'porcao',
  JSON.stringify([{ name: 'P', price: 18.90 }, { name: 'M', price: 24.90 }, { name: 'G', price: 34.90 }])).lastInsertRowid;
insRec.run(fritas, ing.batata, 400);

const picanha = insProd.run(companyId, catPratos, 'Picanha na Brasa (2 pessoas)', 'Acompanha arroz, farofa e vinagrete', 89.90, 22.00, 'prato', null).lastInsertRowid;
insRec.run(picanha, ing.carne, 600);

insProd.run(companyId, catBebidas, 'Refrigerante Lata', 'Coca, Guaraná ou Fanta', 6.50, 2.50, 'bebida', null);
insProd.run(companyId, catBebidas, 'Cerveja Long Neck', 'Heineken / Budweiser', 12.00, 4.00, 'bebida', null);
insProd.run(companyId, catBebidas, 'Suco Natural', 'Laranja, abacaxi ou maracujá', 9.90, 2.00, 'bebida', null);
insProd.run(companyId, catSobrem, 'Petit Gateau', 'Com sorvete de creme', 18.90, 5.00, 'sobremesa', null);
insProd.run(companyId, catSobrem, 'Pudim', 'Pudim de leite caseiro', 12.90, 3.00, 'sobremesa', null);

// Impressora do pedido: bebidas saem na impressora do Caixa/Bar; o resto na Cozinha.
db.exec(`UPDATE products SET print_target = 'bar' WHERE type = 'bebida'`);
db.exec(`UPDATE products SET print_target = 'cozinha' WHERE print_target IS NULL OR print_target = ''`);

// Tables
const insTab = db.prepare(`INSERT INTO restaurant_tables (company_id, number, seats, area, status) VALUES (?,?,?,?,?)`);
const areas = ['Salão', 'Varanda', 'Mezanino'];
for (let i = 1; i <= 12; i++) {
  const status = i % 5 === 0 ? 'reserved' : (i % 3 === 0 ? 'occupied' : 'free');
  insTab.run(companyId, String(i), i % 2 === 0 ? 4 : 2, areas[i % 3], status);
}

// Customers
const insCust = db.prepare(`INSERT INTO customers (company_id, name, phone, cpf, address, birthday, loyalty_points) VALUES (?,?,?,?,?,?,?)`);
insCust.run(companyId, 'Roberto Almeida', '(11) 99876-5432', '123.456.789-00', 'Rua das Flores, 123 - Centro', '1988-04-12', 120);
insCust.run(companyId, 'Fernanda Lima', '(11) 98765-1234', '987.654.321-00', 'Av. Paulista, 1000 - Bela Vista', '1995-09-30', 45);
insCust.run(companyId, 'Pedro Santos', '(11) 97654-9876', '456.789.123-00', 'Rua Augusta, 500 - Consolação', '1990-12-05', 280);

// Open cash session
const sessionId = db.prepare(`INSERT INTO cash_sessions (company_id, opened_by, opening_amount, status) VALUES (?,?,?,?)`)
  .run(companyId, adminId, 200.00, 'open').lastInsertRowid;
db.prepare(`INSERT INTO cash_movements (session_id, type, amount, note) VALUES (?,?,?,?)`)
  .run(sessionId, 'suprimento', 100.00, 'Troco extra');

// Sample open order on an occupied table (mesa 3)
const orderId = db.prepare(`INSERT INTO orders (company_id, type, table_id, waiter_id, status) VALUES (?,?,?,?,?)`)
  .run(companyId, 'mesa', 3, joaoId, 'open').lastInsertRowid;
const insItem = db.prepare(`INSERT INTO order_items (order_id, product_id, name, qty, price, station, print_target, status) VALUES (?,?,?,?,?,?,?,?)`);
insItem.run(orderId, xburger, 'X-Burguer', 2, 22.90, 'cozinha', 'cozinha', 'preparing');
insItem.run(orderId, fritas, 'Batata Frita (M)', 1, 24.90, 'cozinha', 'cozinha', 'ready');
insItem.run(orderId, 6, 'Cerveja Long Neck', 4, 12.00, 'bar', 'bar', 'delivered');

// Finance entries
const insFin = db.prepare(`INSERT INTO finance_entries (company_id, kind, description, category, amount, due_date, paid) VALUES (?,?,?,?,?,?,?)`);
insFin.run(companyId, 'payable', 'Fornecedor de carnes - Frigorífico', 'Insumos', 2400.00, '2026-06-15', 0);
insFin.run(companyId, 'payable', 'Aluguel do imóvel', 'Despesa Fixa', 6500.00, '2026-06-10', 0);
insFin.run(companyId, 'payable', 'Conta de energia', 'Despesa Fixa', 1850.00, '2026-06-20', 0);
insFin.run(companyId, 'payable', 'Salários - Junho', 'Folha', 18500.00, '2026-06-05', 1);
insFin.run(companyId, 'receivable', 'Evento corporativo - Empresa XPTO', 'Venda a prazo', 3200.00, '2026-06-18', 0);
insFin.run(companyId, 'receivable', 'Conta cliente Roberto (fiado)', 'Venda a prazo', 280.00, '2026-06-12', 0);

console.log('✅ Banco populado com sucesso!');
console.log('   Painel SaaS:  admin@admin.com         /  Senha: 123456');
console.log('   Cliente demo: admin@fooddanilo.com    /  Senha: admin123  (Bar do Danilo)');
db.close();
