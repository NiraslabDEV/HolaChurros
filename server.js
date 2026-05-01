require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ── INIT DB ──────────────────────────────────────────────────────────────────
async function initDB() {
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
      status VARCHAR(50) DEFAULT 'pendente',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

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
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
app.post('/api/orders', async (req, res) => {
  try {
    const { customer_name, phone, address, items, sauce, total, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO orders (customer_name, phone, address, items, sauce, total, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [customer_name, phone, address, JSON.stringify(items), sauce, total, notes]
    );
    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
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

app.get('/api/events', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/events/:id/status', async (req, res) => {
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
app.get('/api/stats', async (req, res) => {
  try {
    const [orders, events, revenue, pending] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query('SELECT COUNT(*) FROM events'),
      pool.query("SELECT COALESCE(SUM(total),0) as total FROM orders WHERE status != 'cancelado'"),
      pool.query("SELECT COUNT(*) FROM orders WHERE status='pendente'")
    ]);
    res.json({
      total_orders: parseInt(orders.rows[0].count),
      total_events: parseInt(events.rows[0].count),
      total_revenue: parseInt(revenue.rows[0].total),
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

app.listen(PORT, async () => {
  await initDB();
  console.log(`🚀 Hola Churros server on port ${PORT}`);
});
