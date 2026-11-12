import { Router } from 'express';
import prisma from '../db.js';
import { audit } from '../services/audit.js';
import { evaluateChecklist } from '../../shared/checklist.js';

const router = Router();

// POST บันทึกการประเมิน { taskId, values: { CODE: value } }
// ระบบประเมินผลเองจากเกณฑ์ในตาราง ChecklistItem (พยาบาลไม่ต้องเลือกผลเอง)
router.post('/', async (req, res) => {
  try {
    const { taskId, values = {} } = req.body;
    const task = await prisma.ambulationTask.findUnique({ where: { id: taskId || '' }, include: { patient: true, record: true } });
    if (!task) return res.status(404).json({ error: 'ไม่พบกิจกรรม' });
    if (task.record) return res.status(400).json({ error: 'รอบนี้บันทึกผลการเดินแล้ว' });

    const items = await prisma.checklistItem.findMany({ where: { active: true }, orderBy: [{ groupNo: 'asc' }, { sortOrder: 'asc' }] });
    const evaluation = evaluateChecklist(items, values, task.patient.isCopd);
    if (!evaluation.complete) {
      return res.status(400).json({ error: `กรุณากรอกให้ครบ: ${evaluation.missing.join(', ')}` });
    }

    const assessment = await prisma.assessment.create({
      data: {
        taskId,
        result: evaluation.result,
        failedReasons: evaluation.failed,
        answers: evaluation.answers,
        isCopd: task.patient.isCopd,
        assessedById: req.user.id,
        assessedByName: req.user.name,
      },
    });
    await audit(req, 'CREATE', 'Assessment', assessment.id, { taskId, result: assessment.result });
    res.status(201).json(assessment);
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ error: 'ไม่สามารถบันทึกการประเมินได้' });
  }
});

export default router;
