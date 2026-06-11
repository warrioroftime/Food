import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'fooddanilo-dev-secret-change-me';

export function signToken(user, extra = {}) {
  return jwt.sign(
    { id: user.id, name: user.name, role: user.role, company_id: user.company_id, ...extra },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão expirada ou inválida' });
  }
}
