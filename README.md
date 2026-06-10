# 🍔 FoodDanilo — Sistema SaaS para Bares e Restaurantes

Sistema completo de gestão para bares e restaurantes: PDV, Mesas, Comandas, Garçom Mobile,
Cozinha (KDS), Delivery, Produtos, Estoque, Clientes, Financeiro, Relatórios, Funcionários,
Configurações e Administração SaaS (multiempresa).

Roda igual em **Linux e Windows** — backend Node.js + SQLite (sem instalar banco) e frontend React.

## ✅ Pré-requisitos
- Node.js 22+ (testado em Node 24). O banco usa o módulo nativo `node:sqlite`, sem dependências de compilação.

## 🚀 Como rodar (primeira vez)

```bash
# 1. Instalar dependências de tudo (raiz, server e client)
npm run install:all

# 2. Popular o banco com dados de exemplo
npm run seed

# 3. Subir backend (porta 4000) + frontend (porta 5173) juntos
npm run dev
```

Depois abra **http://localhost:5173**.

### Login de demonstração
- **Usuário:** `admin@fooddanilo.com`
- **Senha:** `admin123`

## 📦 Módulos
| Módulo | Status nesta base |
|---|---|
| Dashboard | ✅ Funcional (dados reais da API) |
| Produtos + Ficha Técnica | ✅ Funcional (CRUD) |
| Mesas | ✅ Funcional (mapa, status) |
| Comandas | ✅ Funcional (abrir, lançar itens, fechar) |
| PDV / Caixa | ✅ Funcional (abertura, vendas, pagamentos) |
| Cozinha (KDS) | ✅ Funcional (status dos pedidos) |
| Clientes | ✅ Funcional (CRUD) |
| Estoque | 🟡 Tela + dados de exemplo |
| Delivery | 🟡 Tela + dados de exemplo |
| Garçom Mobile | 🟡 Tela responsiva + dados de exemplo |
| Financeiro | 🟡 Tela + dados de exemplo |
| Relatórios | 🟡 Tela + gráficos de exemplo |
| Funcionários | 🟡 Tela + dados de exemplo |
| Configurações | 🟡 Tela |
| Administração SaaS | 🟡 Tela (empresas, planos) |

> 🟡 = esqueleto navegável com layout pronto e dados de exemplo, pronto para evoluir.

## 🏗️ Arquitetura
```
FoodDanilo/
├── server/        # API Node.js + Express + SQLite (node:sqlite)
│   └── src/
│       ├── db.js        # schema do banco
│       ├── seed.js      # dados de exemplo
│       ├── auth.js      # login JWT
│       ├── routes/      # rotas por módulo
│       └── index.js     # app principal
└── client/        # React + Vite (SPA responsiva)
    └── src/
        ├── pages/       # uma página por módulo
        └── components/  # layout, sidebar, etc.
```

## 🔧 Produção
```bash
npm run build        # gera client/dist
npm --prefix server start   # serve API + frontend buildado em http://localhost:4000
```
