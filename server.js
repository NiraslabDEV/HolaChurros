require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL não definida. As funcionalidades de base de dados estarão inactivas.');
}

const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
}) : null;

// ── INIT DB ──────────────────────────────────────────────────────────────────
async function initDB() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        address TEXT NOT NULL,
        items JSONB NOT NULL,
        sauce VARCHAR(100),
        total INTEGER NOT NULL,
        notes TEXT,
        extras JSONB DEFAULT '[]',
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS extras JSONB DEFAULT '[]';

      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        contact_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        event_type VARCHAR(255) NOT NULL,
        event_date DATE NOT NULL,
        location TEXT NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        participants INTEGER NOT NULL,
        service VARCHAR(100) NOT NULL,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabelas prontas');
  } catch (err) {
    console.error('❌ Erro ao inicializar BD:', err.message);
  }
}

function dbCheck(res) {
  if (!pool) {
    res.status(503).json({ error: 'Base de dados não configurada. Adicione o PostgreSQL na Railway.' });
    return false;
  }
  return true;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
let sessionToken = null;

app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  const correct = process.env.DASHBOARD_PASSWORD || 'churros2025';
  if (password !== correct) {
    return res.status(401).json({ error: 'Senha incorrecta.' });
  }
  sessionToken = crypto.randomBytes(32).toString('hex');
  res.json({ token: sessionToken });
});

function authRequired(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || token !== sessionToken) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  next();
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
app.post('/api/orders', async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { customer_name, phone, address, items, sauce, total, notes, extras } = req.body;
    const result = await pool.query(
      `INSERT INTO orders (customer_name, phone, address, items, sauce, total, notes, extras)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [customer_name, phone, address, JSON.stringify(items), sauce, total, notes, JSON.stringify(extras || [])]
    );
    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/orders', authRequired, async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', authRequired, async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE orders SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EVENTS ────────────────────────────────────────────────────────────────────
app.post('/api/events', async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { contact_name, phone, event_type, event_date, location, start_time, end_time, participants, service, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO events (contact_name, phone, event_type, event_date, location, start_time, end_time, participants, service, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [contact_name, phone, event_type, event_date, location, start_time, end_time, participants, service, notes]
    );
    res.json({ success: true, event: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/events', authRequired, async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/events/:id/status', authRequired, async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE events SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    res.json({ success: true, event: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── STATS ─────────────────────────────────────────────────────────────────────
app.get('/api/stats', authRequired, async (req, res) => {
  if (!pool) {
    return res.json({ total_orders: 0, total_events: 0, total_revenue: 0, pending_orders: 0 });
  }
  try {
    const [orders, events, revenue, pending] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query('SELECT COUNT(*) FROM events'),
      pool.query("SELECT COALESCE(SUM(total),0) as total FROM orders WHERE status != 'cancelado'"),
      pool.query("SELECT COUNT(*) FROM orders WHERE status='pendente'")
    ]);
    res.json({
      total_orders:   parseInt(orders.rows[0].count),
      total_events:   parseInt(events.rows[0].count),
      total_revenue:  parseInt(revenue.rows[0].total),
      pending_orders: parseInt(pending.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SERVE PAGES ───────────────────────────────────────────────────────────────
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Hola Churros a correr na porta ${PORT}`);
  initDB();
});
