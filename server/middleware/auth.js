import jwt from 'jsonwebtoken';

// ต้องตั้ง JWT_SECRET เสมอบน production (เดิมมีค่าตั้งต้นในโค้ด ทำให้ใครก็ปลอม token ได้)
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET is required in production');
}
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production';

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'ไม่พบ Token กรุณาเข้าสู่ระบบ' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
  }
};

// เฉพาะหัวหน้าเวร
export const requireHeadNurse = (req, res, next) => {
  if (req.user?.role !== 'HEAD_NURSE') {
    return res.status(403).json({ error: 'เฉพาะหัวหน้าเวรเท่านั้น' });
  }
  next();
};
