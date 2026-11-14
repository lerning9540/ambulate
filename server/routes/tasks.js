import { Router } from 'express';
import prisma from '../db.js';
import { audit } from '../services/audit.js';
import { decorateTask } from '../services/status.js';

const router = Router();

// GET กิจกรรม 1 รอบ (ใช้ในหน้าประเมิน/บันทึกผล)
router.get('/:id', async (req, res) => {
  try {
    const task = await prisma.ambulationTask.findUnique({
      where: { id: req.params.id },
      include: { record: true, assessments: { orderBy: { assessedAt: 'desc' } }, patient: true },
    });
    if (!task) return res.status(404).json({ error: 'ไม่พบกิจกรรม' });
    res.json(decorateTask(task));
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลกิจกรรมได้' });
  }
});

// POST เพิ่มรอบลุกเดิน { patientId, scheduledAt }
router.post('/', async (req, res) => {
  try {
    const { patientId, scheduledAt } = req.body;
    const at = new Date(scheduledAt);
    if (!patientId || Number.isNaN(at.getTime())) return res.status(400).json({ error: 'กรุณาระบุวันเวลา' });
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ error: 'ไม่พบผู้ป่วย' });

    const last = await prisma.ambulationTask.findFirst({ where: { patientId }, orderBy: { roundNo: 'desc' } });
    const task = await prisma.ambulationTask.create({
      data: { patientId, roundNo: (last?.roundNo || 0) + 1, scheduledAt: at, createdById: req.user.id },
    });
    await audit(req, 'CREATE', 'AmbulationTask', task.id, { patientId, roundNo: task.roundNo, scheduledAt: at });
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'ไม่สามารถเพิ่มรอบได้' });
  }
});

// PUT แก้เวลา { scheduledAt } พร้อมเก็บประวัติ
router.put('/:id', async (req, res) => {
  try {
    const at = new Date(req.body.scheduledAt);
    if (Number.isNaN(at.getTime())) return res.status(400).json({ error: 'กรุณาระบุวันเวลา' });
    const task = await prisma.ambulationTask.findUnique({ where: { id: req.params.id }, include: { record: true } });
    if (!task) return res.status(404).json({ error: 'ไม่พบกิจกรรม' });
    if (task.record) return res.status(400).json({ error: 'รอบนี้บันทึกผลแล้ว แก้เวลาไม่ได้' });
    if (at.getTime() === task.scheduledAt.getTime()) return res.json(task);

    const [, updated] = await prisma.$transaction([
      prisma.scheduleChange.create({
        data: { taskId: task.id, oldAt: task.scheduledAt, newAt: at, changedById: req.user.id },
      }),
      prisma.ambulationTask.update({
        where: { id: task.id },
        // เปลี่ยนเวลาแล้วให้แจ้งเตือนใหม่ตามเวลาใหม่
        data: { scheduledAt: at, dueNotifiedAt: null, lateNotifiedAt: null },
      }),
    ]);
    await audit(req, 'UPDATE', 'AmbulationTask', task.id, { scheduledAt: { from: task.scheduledAt, to: at } });
    res.json(updated);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'ไม่สามารถแก้เวลาได้' });
  }
});

// DELETE รอบลุกเดิน (ลบได้เฉพาะรอบที่ยังไม่บันทึกผล)
router.delete('/:id', async (req, res) => {
  try {
    const task = await prisma.ambulationTask.findUnique({ where: { id: req.params.id }, include: { record: true } });
    if (!task) return res.status(404).json({ error: 'ไม่พบกิจกรรม' });
    if (task.record) return res.status(400).json({ error: 'รอบนี้บันทึกผลแล้ว ลบไม่ได้' });
    await prisma.ambulationTask.delete({ where: { id: task.id } });
    await audit(req, 'DELETE', 'AmbulationTask', task.id, { patientId: task.patientId, roundNo: task.roundNo, scheduledAt: task.scheduledAt });
    res.json({ message: 'ลบรอบลุกเดินแล้ว' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'ไม่สามารถลบรอบได้' });
  }
});

export default router;
