require('dotenv').config();
const express  = require('express');
const { Pool } = require('pg');
const cors     = require('cors');
const path     = require('path');
const crypto   = require('crypto');
const nodemailer = require('nodemailer');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL não definida. Base de dados inactiva.');
}

const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
}) : null;

// ── EMAIL ─────────────────────────────────────────────────────────────────────
const mailer = (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false }
    })
  : null;

const FROM_ADDR = `¡Hola Churros! <${process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@holachurrosmz.com'}>`;
const SITE_URL  = (process.env.SITE_URL || 'https://holachurrosmz.up.railway.app').replace(/\/$/, '');

async function sendEmail(to, subject, html) {
  if (!mailer || !to || !to.includes('@')) return false;
  try {
    await mailer.sendMail({ from: FROM_ADDR, to, subject, html });
    console.log('📧 Email:', to, '·', subject);
    return true;
  } catch (e) {
    console.warn('⚠️  Email falhou:', e.message);
    return false;
  }
}

// ── EMAIL TEMPLATES ───────────────────────────────────────────────────────────
function tplBase(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0e8d8;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:580px;margin:0 auto;background:#FBF5E6;overflow:hidden;">
  <div style="background:#3D1E08;padding:28px 36px;text-align:center;">
    <div style="font-size:28px;font-weight:900;color:#F5C518;font-style:italic;letter-spacing:-0.02em;">¡Hola Churros!</div>
    <div style="font-size:10px;color:rgba(251,245,230,0.5);margin-top:5px;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">Churreria Artesanal · Maputo</div>
  </div>
  <div style="padding:32px 36px;">${content}</div>
  <div style="background:#3D1E08;padding:16px;text-align:center;">
    <p style="margin:0;font-size:10px;color:rgba(251,245,230,0.4);font-family:Arial,sans-serif;letter-spacing:0.05em;">Av. Amílcar Cabral, 856 · Maputo · +258 85 269 0365</p>
  </div>
</div>
</body></html>`;
}

function tplOrderConfirmation(order) {
  const items  = Array.isArray(order.items)  ? order.items  : [];
  const extras = Array.isArray(order.extras) ? order.extras : [];
  const itemRows = items.map(i =>
    `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(61,30,8,0.07);">
      <span style="color:#1c1008;font-size:14px;">${i.name||'—'}${i.sauce?` <span style="color:#8C7045;font-size:12px;">— ${i.sauce}</span>`:''}</span>
      <span style="color:#3D1E08;font-weight:bold;font-size:14px;margin-left:12px;">${Number(i.price||0).toLocaleString()} MT</span>
    </div>`
  ).join('');
  const extraRows = extras.map(e =>
    `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(61,30,8,0.07);">
      <span style="color:#1c1008;font-size:14px;">${e.label||e.name||e}</span>
      <span style="color:#3D1E08;font-weight:bold;font-size:14px;margin-left:12px;">+100 MT</span>
    </div>`
  ).join('');
  return tplBase(`
    <h2 style="color:#3D1E08;font-size:20px;margin:0 0 6px;font-weight:900;">Pedido recebido! 🎉</h2>
    <p style="color:#8C7045;font-size:14px;font-family:Arial,sans-serif;margin:0 0 20px;line-height:1.6;">
      Olá, <strong style="color:#3D1E08;">${order.customer_name}</strong>! O pedido <strong>#${order.id}</strong> foi recebido e iremos confirmá-lo em breve.
    </p>
    <div style="background:#F0E6C8;padding:18px 20px;margin-bottom:20px;">
      <div style="font-size:10px;font-weight:bold;letter-spacing:0.18em;text-transform:uppercase;color:#8C7045;font-family:Arial,sans-serif;margin-bottom:12px;">Resumo</div>
      ${itemRows}${extraRows}
      <div style="display:flex;justify-content:space-between;padding:12px 0 0;border-top:1px solid rgba(61,30,8,0.12);margin-top:8px;">
        <span style="color:#3D1E08;font-size:15px;font-weight:bold;font-family:Arial,sans-serif;">Total</span>
        <span style="color:#3D1E08;font-size:18px;font-weight:900;">${Number(order.total).toLocaleString()} MT</span>
      </div>
    </div>
    <p style="color:#8C7045;font-size:13px;font-family:Arial,sans-serif;margin:0;line-height:1.6;">🕐 Delivery das <strong style="color:#3D1E08;">14h às 18h</strong> · Encomendas até às 13h30</p>
  `);
}

function tplStatusUpdate(order, status) {
  const info = {
    confirmado: {
      icon: '👨‍🍳', title: 'Pedido confirmado!',
      body: `O pedido <strong>#${order.id}</strong> está a ser preparado. Irá receber os seus churros no período de delivery das <strong>14h às 18h</strong>.`
    },
    'a caminho': {
      icon: '🛵', title: 'O seu pedido saiu da loja!',
      body: `Os seus churros estão a caminho! Pedido <strong>#${order.id}</strong> a ser entregue em ${order.address ? `<strong>${order.address}</strong>` : 'breve'}.`
    },
    cancelado: {
      icon: '❌', title: 'Pedido cancelado',
      body: `Lamentamos, o pedido <strong>#${order.id}</strong> foi cancelado. Contacte-nos: <a href="https://wa.me/258852690365" style="color:#C8960C;">WhatsApp +258 85 269 0365</a>`
    }
  };
  const m = info[status];
  if (!m) return null;
  return tplBase(`
    <div style="font-size:42px;margin-bottom:12px;line-height:1;">${m.icon}</div>
    <h2 style="color:#3D1E08;font-size:20px;margin:0 0 12px;font-weight:900;">${m.title}</h2>
    <p style="color:#8C7045;font-size:14px;font-family:Arial,sans-serif;line-height:1.7;margin:0 0 20px;">${m.body}</p>
    <a href="https://wa.me/258852690365" style="display:inline-block;background:#25D366;color:white;padding:12px 24px;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:0.05em;">💬 Contactar via WhatsApp</a>
  `);
}

function tplReviewRequest(order, token, loyaltyCount) {
  const url    = `${SITE_URL}/review/${token}`;
  const done   = loyaltyCount;
  const remaining = 5 - (done % 5 || 5);
  const loyaltyLine = (done > 0 && done % 5 === 0)
    ? `<div style="background:#F5C518;padding:10px 14px;text-align:center;margin-top:12px;"><strong style="color:#3D1E08;font-family:Arial,sans-serif;font-size:13px;">🎉 Chegou ao nível ${done}! Peça o seu molho extra GRÁTIS.</strong></div>`
    : `<p style="color:#8C7045;font-size:12px;font-family:Arial,sans-serif;margin:8px 0 0;">Tem ${done} avaliação${done !== 1 ? 'ões' : ''}. Faltam ${remaining} para o molho extra grátis! 🎁</p>`;
  return tplBase(`
    <h2 style="color:#3D1E08;font-size:20px;margin:0 0 8px;font-weight:900;">O seu pedido chegou! 🌟</h2>
    <p style="color:#8C7045;font-size:14px;font-family:Arial,sans-serif;margin:0 0 20px;line-height:1.6;">
      Olá, <strong style="color:#3D1E08;">${order.customer_name}</strong>! Esperamos que tenha adorado os churros do pedido <strong>#${order.id}</strong>. Conta-nos como foi?
    </p>
    <a href="${url}" style="display:block;background:#3D1E08;color:#F5C518;text-align:center;padding:16px 24px;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;">⭐ Deixar Avaliação</a>
    <div style="background:#F0E6C8;padding:16px 20px;margin-top:16px;">
      <div style="font-size:10px;font-weight:bold;letter-spacing:0.18em;text-transform:uppercase;color:#8C7045;font-family:Arial,sans-serif;margin-bottom:6px;">Programa de Fidelidade</div>
      <div style="font-size:13px;color:#3D1E08;font-family:Arial,sans-serif;line-height:1.6;">Com 5 avaliações ganhas um <strong>molho extra grátis</strong> no próximo pedido!</div>
      ${loyaltyLine}
    </div>
    <p style="color:#8C7045;font-size:11px;font-family:Arial,sans-serif;margin:14px 0 0;">Este link é exclusivo para si. Só acessível por clientes com encomenda.</p>
  `);
}

// ── INIT DB ───────────────────────────────────────────────────────────────────
async function initDB() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id            SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        phone         VARCHAR(50)  NOT NULL,
        address       TEXT         NOT NULL,
        items         JSONB        NOT NULL,
        sauce         VARCHAR(100),
        total         INTEGER      NOT NULL,
        notes         TEXT,
        extras        JSONB        DEFAULT '[]',
        status        VARCHAR(50)  DEFAULT 'pendente',
        created_at    TIMESTAMPTZ  DEFAULT NOW()
      );
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS extras       JSONB       DEFAULT '[]';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS email        VARCHAR(255);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS review_token VARCHAR(64);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS review_sent  BOOLEAN     DEFAULT FALSE;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS zone         VARCHAR(100);

      CREATE TABLE IF NOT EXISTS analytics (
        id         SERIAL PRIMARY KEY,
        event      VARCHAR(50)  NOT NULL,
        session_id VARCHAR(64),
        metadata   JSONB,
        created_at TIMESTAMPTZ  DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_event   ON analytics(event);
      CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at);

      CREATE TABLE IF NOT EXISTS events (
        id            SERIAL PRIMARY KEY,
        contact_name  VARCHAR(255) NOT NULL,
        phone         VARCHAR(50)  NOT NULL,
        event_type    VARCHAR(255) NOT NULL,
        event_date    DATE         NOT NULL,
        location      TEXT         NOT NULL,
        start_time    TIME         NOT NULL,
        end_time      TIME         NOT NULL,
        participants  INTEGER      NOT NULL,
        service       VARCHAR(100) NOT NULL,
        notes         TEXT,
        status        VARCHAR(50)  DEFAULT 'pendente',
        created_at    TIMESTAMPTZ  DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id         SERIAL PRIMARY KEY,
        order_id   INTEGER REFERENCES orders(id),
        email      VARCHAR(255) NOT NULL,
        rating     INTEGER      NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment    TEXT,
        created_at TIMESTAMPTZ  DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_reviews_email    ON reviews(email);
      CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
    `);
    console.log('✅ Tabelas prontas');
  } catch (err) {
    console.error('❌ Erro BD:', err.message);
  }
}

function dbCheck(res) {
  if (!pool) {
    res.status(503).json({ error: 'Base de dados não configurada.' });
    return false;
  }
  return true;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
let sessionToken = null;

app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  const correct = process.env.DASHBOARD_PASSWORD || 'churros2025';
  if (password !== correct) return res.status(401).json({ error: 'Senha incorrecta.' });
  sessionToken = crypto.randomBytes(32).toString('hex');
  res.json({ token: sessionToken });
});

function authRequired(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || token !== sessionToken) return res.status(401).json({ error: 'Não autorizado.' });
  next();
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
app.post('/api/orders', async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { customer_name, phone, address, items, sauce, total, notes, extras, email, zone } = req.body;
    const cleanEmail    = (email && email.includes('@')) ? email.trim().toLowerCase() : null;
    const review_token  = cleanEmail ? crypto.randomBytes(32).toString('hex') : null;

    const result = await pool.query(
      `INSERT INTO orders (customer_name, phone, address, items, sauce, total, notes, extras, email, review_token, zone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [customer_name, phone, address, JSON.stringify(items), sauce, total, notes,
       JSON.stringify(extras || []), cleanEmail, review_token, zone || null]
    );
    const order = result.rows[0];
    res.json({ success: true, order });

    // Send confirmation email (fire-and-forget)
    if (cleanEmail) {
      sendEmail(cleanEmail, `¡Hola Churros! — Pedido #${order.id} recebido 🎉`, tplOrderConfirmation(order));
    }
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
    const order = result.rows[0];
    res.json({ success: true, order, email_sent: !!(order && order.email) });

    // Send status email (async after response)
    if (order && order.email) {
      if (['confirmado', 'a caminho', 'cancelado'].includes(status)) {
        const html = tplStatusUpdate(order, status);
        const subjects = {
          confirmado:  `¡Hola Churros! — Pedido #${order.id} confirmado 👨‍🍳`,
          'a caminho': `¡Hola Churros! — O seu pedido está a caminho! 🛵`,
          cancelado:   `¡Hola Churros! — Pedido #${order.id} cancelado`
        };
        if (html) sendEmail(order.email, subjects[status], html);
      } else if (status === 'entregue' && !order.review_sent && order.review_token) {
        const loyaltyRes = await pool.query(
          'SELECT COUNT(*) FROM reviews WHERE email=$1', [order.email]
        );
        const loyaltyCount = parseInt(loyaltyRes.rows[0].count);
        const html = tplReviewRequest(order, order.review_token, loyaltyCount);
        const sent = await sendEmail(order.email, `¡Hola Churros! — Como foi? Deixe a sua avaliação ⭐`, html);
        if (sent) await pool.query('UPDATE orders SET review_sent=TRUE WHERE id=$1', [order.id]);
      }
    }
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
  if (!pool) return res.json({ total_orders:0, total_events:0, total_revenue:0, pending_orders:0 });
  try {
    const [orders, events, revenue, pending, todayOrders, todayRevenue, reviewCount] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query('SELECT COUNT(*) FROM events'),
      pool.query("SELECT COALESCE(SUM(total),0) as total FROM orders WHERE status != 'cancelado'"),
      pool.query("SELECT COUNT(*) FROM orders WHERE status='pendente'"),
      pool.query('SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE'),
      pool.query("SELECT COALESCE(SUM(total),0) as total FROM orders WHERE created_at >= CURRENT_DATE AND status != 'cancelado'"),
      pool.query('SELECT COUNT(*) FROM reviews')
    ]);
    res.json({
      total_orders:   parseInt(orders.rows[0].count),
      total_events:   parseInt(events.rows[0].count),
      total_revenue:  parseInt(revenue.rows[0].total),
      pending_orders: parseInt(pending.rows[0].count),
      today_orders:   parseInt(todayOrders.rows[0].count),
      today_revenue:  parseInt(todayRevenue.rows[0].total),
      total_reviews:  parseInt(reviewCount.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
app.post('/api/analytics', async (req, res) => {
  res.json({ ok: true });
  if (!pool) return;
  try {
    const { event, session_id, metadata } = req.body;
    if (!event) return;
    await pool.query(
      'INSERT INTO analytics (event, session_id, metadata) VALUES ($1,$2,$3)',
      [event, session_id || null, JSON.stringify(metadata || {})]
    );
  } catch (_) {}
});

app.get('/api/analytics/funnel', authRequired, async (req, res) => {
  if (!pool) return res.json([]);
  try {
    const [visits, menuClicks, orderStarts, step1, step2, waSent] = await Promise.all([
      pool.query('SELECT COUNT(DISTINCT session_id) FROM analytics'),
      pool.query("SELECT COUNT(DISTINCT session_id) FROM analytics WHERE event='menu_clicked'"),
      pool.query("SELECT COUNT(DISTINCT session_id) FROM analytics WHERE event='order_started'"),
      pool.query("SELECT COUNT(DISTINCT session_id) FROM analytics WHERE event='step1_complete'"),
      pool.query("SELECT COUNT(DISTINCT session_id) FROM analytics WHERE event='step2_complete'"),
      pool.query("SELECT COUNT(DISTINCT session_id) FROM analytics WHERE event='wa_sent'")
    ]);
    const v = parseInt(visits.rows[0].count) || 0;
    const w = parseInt(waSent.rows[0].count) || 0;
    res.json({
      total_visits:   v,
      menu_clicked:   parseInt(menuClicks.rows[0].count),
      order_started:  parseInt(orderStarts.rows[0].count),
      step1_complete: parseInt(step1.rows[0].count),
      step2_complete: parseInt(step2.rows[0].count),
      wa_sent:        w,
      conversion_rate: v > 0 ? Math.round((w / v) * 100) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── REVENUE ───────────────────────────────────────────────────────────────────
app.get('/api/revenue', authRequired, async (req, res) => {
  if (!pool) return res.json([]);
  const period = req.query.period || 'monthly';
  try {
    let q;
    if (period === 'daily') {
      q = `SELECT TO_CHAR(created_at,'DD/MM') AS label,
                  TO_CHAR(created_at,'YYYY-MM-DD') AS sort_key,
                  COUNT(*)::int AS orders,
                  COALESCE(SUM(total),0)::int AS revenue
           FROM orders WHERE status!='cancelado' AND created_at >= NOW()-INTERVAL '30 days'
           GROUP BY label,sort_key ORDER BY sort_key`;
    } else if (period === 'monthly') {
      q = `SELECT TO_CHAR(created_at,'Mon/YY') AS label,
                  TO_CHAR(created_at,'YYYY-MM') AS sort_key,
                  COUNT(*)::int AS orders,
                  COALESCE(SUM(total),0)::int AS revenue
           FROM orders WHERE status!='cancelado' AND created_at >= NOW()-INTERVAL '13 months'
           GROUP BY label,sort_key ORDER BY sort_key`;
    } else {
      q = `SELECT TO_CHAR(created_at,'YYYY') AS label,
                  TO_CHAR(created_at,'YYYY') AS sort_key,
                  COUNT(*)::int AS orders,
                  COALESCE(SUM(total),0)::int AS revenue
           FROM orders WHERE status!='cancelado'
           GROUP BY label,sort_key ORDER BY sort_key`;
    }
    const result = await pool.query(q);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── REGIONS ───────────────────────────────────────────────────────────────────
app.get('/api/regions', authRequired, async (req, res) => {
  if (!pool) return res.json([]);
  try {
    const result = await pool.query(`
      SELECT COALESCE(NULLIF(TRIM(zone),''),'Não especificado') AS zone,
             COUNT(*)::int AS orders,
             COALESCE(SUM(total),0)::int AS revenue
      FROM orders WHERE status!='cancelado'
      GROUP BY zone ORDER BY orders DESC LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── TOP CUSTOMERS ─────────────────────────────────────────────────────────────
app.get('/api/customers/top', authRequired, async (req, res) => {
  if (!pool) return res.json([]);
  const period = req.query.period || 'all';
  const dateFilter = period === 'month'
    ? `AND created_at >= DATE_TRUNC('month', NOW())` : '';
  try {
    const result = await pool.query(`
      SELECT customer_name, phone,
             COUNT(*)::int AS orders,
             COALESCE(SUM(total),0)::int AS revenue,
             MAX(created_at) AS last_order
      FROM orders WHERE status!='cancelado' ${dateFilter}
      GROUP BY customer_name, phone
      ORDER BY orders DESC, revenue DESC LIMIT 10
    `);
    res.json(result.rows.map(r => ({
      name: r.customer_name, phone: r.phone,
      orders: r.orders, revenue: r.revenue,
      last_order: r.last_order
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── REVIEWS ───────────────────────────────────────────────────────────────────
// Serve review page
app.get('/review/:token', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'review.html'));
});

// Get order info for review page (public — only non-sensitive fields)
app.get('/api/review/:token', async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const result = await pool.query(
      'SELECT id, customer_name, total, created_at FROM orders WHERE review_token=$1 AND email IS NOT NULL',
      [req.params.token]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Link inválido ou expirado.' });
    const order = result.rows[0];
    const reviewed = await pool.query('SELECT id FROM reviews WHERE order_id=$1', [order.id]);
    res.json({ order, already_reviewed: reviewed.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit review (public)
app.post('/api/review/:token', async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Avaliação inválida (1–5).' });

    const orderRes = await pool.query(
      'SELECT id, email, customer_name FROM orders WHERE review_token=$1 AND email IS NOT NULL',
      [req.params.token]
    );
    if (!orderRes.rows.length) return res.status(404).json({ error: 'Link inválido.' });
    const order = orderRes.rows[0];

    const existing = await pool.query('SELECT id FROM reviews WHERE order_id=$1', [order.id]);
    if (existing.rows.length) return res.status(409).json({ error: 'Já avaliou este pedido.' });

    await pool.query(
      'INSERT INTO reviews (order_id, email, rating, comment) VALUES ($1,$2,$3,$4)',
      [order.id, order.email, rating, comment || null]
    );

    const loyaltyRes = await pool.query('SELECT COUNT(*) FROM reviews WHERE email=$1', [order.email]);
    const count = parseInt(loyaltyRes.rows[0].count);
    res.json({ success: true, loyalty_count: count, is_reward: count > 0 && count % 5 === 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: list all reviews
app.get('/api/reviews', authRequired, async (_req, res) => {
  if (!dbCheck(res)) return;
  try {
    const result = await pool.query(`
      SELECT r.id, r.rating, r.comment, r.created_at, r.email,
             o.customer_name, o.id AS order_id
      FROM reviews r
      JOIN orders o ON o.id = r.order_id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PAGES ─────────────────────────────────────────────────────────────────────
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Hola Churros na porta ${PORT}`);
  initDB();
});
