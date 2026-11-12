import { Router } from 'express';
import prisma from '../db.js';
import { audit } from '../services/audit.js';
import { requireHeadNurse } from '../middleware/auth.js';

const router = Router();

// GET เกณฑ์ (?all=1 รวมรายการที่ปิดใช้งาน)
router.get('/', async (req, res) => {
  try {
    const items = await prisma.checklistItem.findMany({
      where: req.query.all ? {} : { active: true },
      orderBy: [{ groupNo: 'asc' }, { sortOrder: 'asc' }],
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงเกณฑ์ได้' });
  }
});

const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

function pickItem(b) {
  const data = {};
  for (const k of ['groupLabel', 'label', 'unit', 'description', 'advice']) if (b[k] !== undefined) data[k] = b[k] === '' ? null : String(b[k]);
  for (const k of ['minValue', 'maxValue', 'copdMinValue']) if (b[k] !== undefined) data[k] = numOrNull(b[k]);
  for (const k of ['minInclusive', 'maxInclusive', 'active']) if (b[k] !== undefined) data[k] = Boolean(b[k]);
  for (const k of ['groupNo', 'sortOrder']) if (b[k] !== undefined) data[k] = parseInt(b[k]) || 0;
  if (b.kind !== undefined && ['NUMBER', 'BOOL', 'MAP'].includes(b.kind)) data.kind = b.kind;
  return data;
}

// PUT แก้เกณฑ์ (หัวหน้าเวร)
router.put('/:id', requireHeadNurse, async (req, res) => {
  try {
    const data = pickItem(req.body);
    if (data.label === null || data.groupLabel === null) return res.status(400).json({ error: 'ต้องมีชื่อรายการ' });
    const item = await prisma.checklistItem.update({ where: { id: req.params.id }, data });
    await audit(req, 'UPDATE', 'ChecklistItem', item.id, data);
    res.json(item);
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ error: 'ไม่สามารถแก้เกณฑ์ได้' });
  }
});

// POST เพิ่มเกณฑ์ใหม่ (หัวหน้าเวร)
router.post('/', requireHeadNurse, async (req, res) => {
  try {
    const data = pickItem(req.body);
    if (!data.label || !data.groupLabel || !data.kind) return res.status(400).json({ error: 'กรุณากรอกชื่อข้อ ชื่อรายการ และชนิด' });
    const item = await prisma.checklistItem.create({ data: { ...data, code: `CUSTOM_${Date.now()}` } });
    await audit(req, 'CREATE', 'ChecklistItem', item.id, data);
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating checklist item:', error);
    res.status(500).json({ error: 'ไม่สามารถเพิ่มเกณฑ์ได้' });
  }
});

export default router;
