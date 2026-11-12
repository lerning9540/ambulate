import { Router } from 'express';
import prisma from '../db.js';
import { audit } from '../services/audit.js';

const router = Router();

// PUT ปิดเรื่องเหตุการณ์ผิดปกติ { closeNote }
router.put('/:id/close', async (req, res) => {
  try {
    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedById: req.user.id,
        closedByName: req.user.name,
        closeNote: req.body.closeNote || null,
      },
    });
    await audit(req, 'UPDATE', 'Incident', incident.id, { status: 'CLOSED', closeNote: incident.closeNote });
    res.json(incident);
  } catch (error) {
    console.error('Error closing incident:', error);
    res.status(500).json({ error: 'ไม่สามารถปิดเรื่องได้' });
  }
});

export default router;
