import jwt from 'jsonwebtoken';

export function auth(req, res, next) {
  try {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: '未授权' });
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, email: payload.email, username: payload.username };
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: '无效或过期的令牌' });
  }
}


