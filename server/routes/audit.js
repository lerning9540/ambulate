import { Router } from 'express';
import prisma from '../db.js';

const router = Router();

// GET ประวัติการแก้ไข 200 รายการล่าสุด (หัวหน้าเวร)
router.get('/', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงประวัติได้' });
  }
});

export default router;
