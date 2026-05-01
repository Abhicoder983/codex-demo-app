import http from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const db = { users: [], records: [] };

const roles = ['VIEWER', 'ANALYST', 'ADMIN'];
const statuses = ['ACTIVE', 'INACTIVE'];
const types = ['INCOME', 'EXPENSE'];

function hash(value) {
  return createHmac('sha256', JWT_SECRET).update(value).digest('hex');
}

function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  const [h, b, s] = token.split('.');
  if (!h || !b || !s) return null;
  const expected = createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
  if (expected !== s) return null;
  return JSON.parse(Buffer.from(b, 'base64url').toString('utf8'));
}

function send(res, code, payload) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
    });
  });
}

function auth(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

function seedAdmin() {
  db.users.push({ id: randomUUID(), name: 'Admin', email: 'admin@local.dev', passwordHash: hash('admin123'), role: 'ADMIN', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}
seedAdmin();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'POST' && url.pathname === '/auth/login') {
      const body = await parseBody(req);
      const user = db.users.find((u) => u.email === body.email && u.passwordHash === hash(body.password));
      if (!user) return send(res, 401, { success: false, message: 'Invalid credentials' });
      return send(res, 200, { success: true, token: createToken({ sub: user.id, role: user.role }) });
    }

    if (req.method === 'POST' && url.pathname === '/users') {
      const claims = auth(req);
      if (!claims || claims.role !== 'ADMIN') return send(res, 403, { success: false, message: 'Forbidden' });
      const body = await parseBody(req);
      if (!roles.includes(body.role) || !statuses.includes(body.status)) return send(res, 400, { success: false, message: 'Validation failed' });
      const user = { id: randomUUID(), name: body.name, email: body.email, passwordHash: hash(body.password), role: body.role, status: body.status, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      db.users.push(user);
      return send(res, 201, { success: true, data: { ...user, passwordHash: undefined } });
    }

    if (req.method === 'GET' && url.pathname === '/records') {
      const claims = auth(req);
      if (!claims) return send(res, 401, { success: false, message: 'Unauthorized' });
      let records = [...db.records];
      const { type, category, fromDate, toDate, page = '1', limit = '10' } = Object.fromEntries(url.searchParams.entries());
      if (type) records = records.filter((r) => r.type === type);
      if (category) records = records.filter((r) => r.category === category);
      if (fromDate) records = records.filter((r) => r.recordDate >= fromDate);
      if (toDate) records = records.filter((r) => r.recordDate <= toDate);
      const p = Number(page), l = Number(limit), start = (p - 1) * l;
      return send(res, 200, { success: true, data: records.slice(start, start + l), meta: { total: records.length, page: p, limit: l } });
    }

    if (req.method === 'POST' && url.pathname === '/records') {
      const claims = auth(req);
      if (!claims || claims.role !== 'ADMIN') return send(res, 403, { success: false, message: 'Forbidden' });
      const body = await parseBody(req);
      if (!types.includes(body.type) || !(body.amount > 0)) return send(res, 400, { success: false, message: 'Validation failed' });
      const record = { id: randomUUID(), amount: body.amount, type: body.type, category: body.category, recordDate: body.recordDate, notes: body.notes ?? null, createdBy: claims.sub, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isDeleted: false };
      db.records.push(record);
      return send(res, 201, { success: true, data: record });
    }

    if (req.method === 'GET' && url.pathname === '/dashboard/summary') {
      const claims = auth(req);
      if (!claims) return send(res, 401, { success: false, message: 'Unauthorized' });
      const totalIncome = db.records.filter((r) => r.type === 'INCOME' && !r.isDeleted).reduce((a, r) => a + r.amount, 0);
      const totalExpense = db.records.filter((r) => r.type === 'EXPENSE' && !r.isDeleted).reduce((a, r) => a + r.amount, 0);
      return send(res, 200, { success: true, data: { totalIncome, totalExpense, netBalance: totalIncome - totalExpense } });
    }

    send(res, 404, { success: false, message: 'Not found' });
  } catch (e) {
    send(res, 500, { success: false, message: e.message });
  }
});

server.listen(PORT, () => console.log(`API running on :${PORT}`));
