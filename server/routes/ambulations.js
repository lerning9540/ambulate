import { Router } from 'express';
import prisma from '../db.js';
import { audit } from '../services/audit.js';

const router = Router();

const ASSIST_LEVELS = ['เดินได้ด้วยตนเอง', 'ต้องมีผู้ช่วยพยุง', 'ต้องใช้เครื่องช่วยเดิน', 'ต้องมีเจ้าหน้าที่ช่วยเหลือ'];

// POST บันทึกผลการลุกเดินของรอบ { taskId, startTime, endTime, ... }
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    const task = await prisma.ambulationTask.findUnique({ where: { id: b.taskId || '' }, include: { patient: true, record: true } });
    if (!task) return res.status(404).json({ error: 'ไม่พบกิจกรรม' });
    if (task.record) return res.status(400).json({ error: 'รอบนี้บันทึกผลแล้ว' });

    const startTime = new Date(b.startTime);
    const endTime = new Date(b.endTime);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      return res.status(400).json({ error: 'กรุณาระบุเวลาเริ่มและเวลาสิ้นสุด' });
    }
    if (endTime < startTime) return res.status(400).json({ error: 'เวลาสิ้นสุดต้องไม่ก่อนเวลาเริ่ม' });
    if (startTime > new Date(Date.now() + 5 * 60000)) return res.status(400).json({ error: 'เวลาเริ่มต้องไม่เป็นเวลาในอนาคต' });
    if (!ASSIST_LEVELS.includes(b.assistLevel)) return res.status(400).json({ error: 'กรุณาเลือกระดับการช่วยเหลือ' });
    if (b.distance == null && b.duration == null && !b.stoppedEarly) {
      return res.status(400).json({ error: 'กรุณาระบุระยะทางหรือระยะเวลาที่เดิน' });
    }

    const complication = (b.complication || '').trim();
    const record = await prisma.ambulationRecord.create({
      data: {
        taskId: task.id,
        startTime,
        endTime,
        distance: b.distance != null && b.distance !== '' ? parseFloat(b.distance) : null,
        duration: b.duration != null && b.duration !== '' ? parseInt(b.duration) : null,
        assistLevel: b.assistLevel,
        tolerance: b.tolerance || null,
        symptomsDuring: b.symptomsDuring || null,
        symptomsAfter: b.symptomsAfter || null,
        complication: complication || null,
        stoppedEarly: Boolean(b.stoppedEarly),
        note: b.note || null,
        recordedById: req.user.id,
        recordedByName: req.user.name,
      },
    });

    // มีเหตุการณ์ผิดปกติ -> สร้างรายการติดตาม + แจ้งเตือน
    if (complication) {
      const incident = await prisma.incident.create({
        data: {
          patientId: task.patientId,
          recordId: record.id,
          detail: complication,
          createdById: req.user.id,
          createdByName: req.user.name,
        },
      });
      await prisma.notification.create({
        data: {
          patientId: task.patientId,
          taskId: task.id,
          type: 'INCIDENT',
          message: `🚩 เหตุการณ์ผิดปกติ ${task.patient.name} (AN: ${task.patient.an}): ${complication} — ต้องติดตามอาการ`,
        },
      });
      await audit(req, 'CREATE', 'Incident', incident.id, { detail: complication });
    }

    await audit(req, 'CREATE', 'AmbulationRecord', record.id, { taskId: task.id, startTime, endTime });
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating ambulation:', error);
    res.status(500).json({ error: 'ไม่สามารถบันทึกการเดินได้' });
  }
});

export default router;
