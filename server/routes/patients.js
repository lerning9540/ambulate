import { Router } from 'express';
import prisma from '../db.js';
import { audit } from '../services/audit.js';
import { decorateTask, bangkokDayRange, todayBangkok } from '../services/status.js';

const router = Router();

const taskInclude = {
  record: true,
  assessments: { orderBy: { assessedAt: 'desc' } },
};

// ฟิลด์ที่แก้ได้ (กันการส่งฟิลด์อื่นเข้ามาแก้ฐานข้อมูลตรง ๆ)
function pickPatientFields(body) {
  const data = {};
  if (body.an !== undefined) data.an = String(body.an).trim();
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.age !== undefined) data.age = parseInt(body.age);
  if (body.gender !== undefined) data.gender = body.gender === 'F' ? 'F' : 'M';
  if (body.bed !== undefined) data.bed = body.bed ? String(body.bed).trim() : null;
  if (body.surgeryType !== undefined) data.surgeryType = String(body.surgeryType);
  if (body.orDischargeAt !== undefined) data.orDischargeAt = new Date(body.orDischargeAt);
  if (body.linesDevices !== undefined) data.linesDevices = body.linesDevices || null;
  if (body.doctorRestriction !== undefined) data.doctorRestriction = body.doctorRestriction || null;
  if (body.note !== undefined) data.note = body.note || null;
  if (body.isCopd !== undefined) data.isCopd = Boolean(body.isCopd);
  if (body.dischargedHomeAt !== undefined) data.dischargedHomeAt = body.dischargedHomeAt ? new Date(body.dischargedHomeAt) : null;
  return data;
}

function validatePatient(data, isCreate) {
  if (isCreate || data.an !== undefined) {
    if (!data.an || !/^\d{8}$/.test(data.an)) return 'AN ต้องเป็นตัวเลข 8 หลัก';
  }
  if (isCreate && (!data.name || !data.surgeryType || !data.orDischargeAt)) return 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน';
  if (data.age !== undefined && (!Number.isInteger(data.age) || data.age < 0 || data.age > 130)) return 'อายุไม่ถูกต้อง';
  if (data.orDischargeAt !== undefined && Number.isNaN(data.orDischargeAt.getTime())) return 'เวลาออกจากห้องผ่าตัดไม่ถูกต้อง';
  if (data.dischargedHomeAt instanceof Date && Number.isNaN(data.dischargedHomeAt.getTime())) return 'วันเวลาที่กลับบ้านไม่ถูกต้อง';
  return null;
}

// GET รายชื่อผู้ป่วย (ค้นหาด้วย AN หรือชื่อ ?q=)
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const where = q ? { OR: [{ an: { contains: q } }, { name: { contains: q, mode: 'insensitive' } }] } : {};
    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: { include: taskInclude, orderBy: { scheduledAt: 'asc' } },
        incidents: { where: { status: 'OPEN' }, select: { id: true } },
      },
    });
    const now = new Date();
    res.json(
      patients.map((p) => {
        const tasks = p.tasks.map((t) => decorateTask(t, now));
        const next = tasks.find((t) => !t.record) || null;
        return {
          ...p,
          tasks: undefined,
          taskCount: tasks.length,
          nextTask: next ? { id: next.id, roundNo: next.roundNo, scheduledAt: next.scheduledAt, status: next.status, readiness: next.readiness } : null,
          openIncidents: p.incidents.length,
          incidents: undefined,
        };
      })
    );
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ป่วยได้' });
  }
});

// GET Dashboard ตามวันที่ (?date=YYYY-MM-DD เวลาไทย)
router.get('/dashboard', async (req, res) => {
  try {
    const date = req.query.date || todayBangkok();
    const range = bangkokDayRange(date);
    if (!range) return res.status(400).json({ error: 'วันที่ไม่ถูกต้อง' });

    const [tasksRaw, openIncidents] = await Promise.all([
      prisma.ambulationTask.findMany({
        where: { scheduledAt: { gte: range.start, lt: range.end } },
        include: { ...taskInclude, patient: { select: { id: true, an: true, name: true, bed: true, dischargedHomeAt: true } } },
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.incident.findMany({
        where: { status: 'OPEN' },
        include: { patient: { select: { id: true, an: true, name: true, bed: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const now = new Date();
    const tasks = tasksRaw.map((t) => {
      const d = decorateTask(t, now);
      return {
        id: d.id,
        roundNo: d.roundNo,
        scheduledAt: d.scheduledAt,
        status: d.status,
        readiness: d.readiness,
        patient: d.patient,
        startTime: d.record?.startTime || null,
      };
    });

    const completed = tasks.filter((t) => t.status.startsWith('COMPLETED'));
    const notReadyPatients = new Set(tasks.filter((t) => t.readiness === 'NOT_READY').map((t) => t.patient.id));

    res.json({
      date,
      summary: {
        patientsToday: new Set(tasks.map((t) => t.patient.id)).size,
        completed: completed.length,
        onTime: tasks.filter((t) => t.status === 'COMPLETED_ON_TIME').length,
        late: tasks.filter((t) => t.status === 'COMPLETED_LATE').length,
        notDone: tasks.length - completed.length,
        overdue: tasks.filter((t) => t.status === 'OVERDUE').length,
        notReadyPatients: notReadyPatients.size,
        dischargedPatients: new Set(tasks.filter((t) => t.patient.dischargedHomeAt).map((t) => t.patient.id)).size,
        openIncidents: openIncidents.length,
      },
      tasks,
      incidents: openIncidents,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูล Dashboard ได้' });
  }
});

// GET รายงานสถิติ (?from=YYYY-MM-DD&to=YYYY-MM-DD)
router.get('/reports', async (req, res) => {
  try {
    const to = req.query.to || todayBangkok();
    const toRange = bangkokDayRange(to);
    const fromStr = req.query.from || new Date(toRange.start.getTime() - 9 * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
    const fromRange = bangkokDayRange(fromStr);
    if (!toRange || !fromRange) return res.status(400).json({ error: 'วันที่ไม่ถูกต้อง' });

    const tasksRaw = await prisma.ambulationTask.findMany({
      where: { scheduledAt: { gte: fromRange.start, lt: toRange.end } },
      include: { ...taskInclude, patient: { select: { id: true, orDischargeAt: true } } },
    });
    const now = new Date();
    const tasks = tasksRaw.map((t) => decorateTask(t, now));
    const completed = tasks.filter((t) => t.record);
    const onTime = tasks.filter((t) => t.status === 'COMPLETED_ON_TIME');

    // เวลาเฉลี่ยจากออกห้องผ่าตัดถึงการลุกเดินครั้งแรกของผู้ป่วยแต่ละราย
    const firstStart = {};
    for (const t of completed) {
      const s = new Date(t.record.startTime).getTime();
      if (!firstStart[t.patientId] || s < firstStart[t.patientId].s) firstStart[t.patientId] = { s, or: new Date(t.patient.orDischargeAt).getTime() };
    }
    const diffs = Object.values(firstStart).map((x) => x.s - x.or).filter((d) => d > 0);
    const avgMs = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
    const h = Math.floor(avgMs / 3600000);
    const m = Math.floor((avgMs % 3600000) / 60000);

    const daily = {};
    for (const t of tasks) {
      const day = new Date(new Date(t.scheduledAt).getTime() + 7 * 3600000).toISOString().slice(0, 10);
      daily[day] = daily[day] || { total: 0, onTime: 0, late: 0, notDone: 0 };
      daily[day].total += 1;
      if (t.status === 'COMPLETED_ON_TIME') daily[day].onTime += 1;
      else if (t.status === 'COMPLETED_LATE') daily[day].late += 1;
      else if (!t.record) daily[day].notDone += 1;
    }
    const chartData = Object.keys(daily)
      .sort()
      .map((d) => {
        const [, mm, dd] = d.split('-');
        const c = daily[d];
        return {
          day: `${parseInt(dd)}/${parseInt(mm)}`,
          rate: Math.round((c.onTime / c.total) * 100),
          total: c.total,
          onTime: c.onTime,
          late: c.late,
          notDone: c.notDone,
        };
      });

    const pct = (a, b) => (b > 0 ? parseFloat(((a / b) * 100).toFixed(1)) : 0);
    res.json({
      from: fromStr,
      to,
      totalPatients: new Set(tasks.map((t) => t.patientId)).size,
      totalTasks: tasks.length,
      onTimeRate: pct(onTime.length, tasks.length),
      completionRate: pct(completed.length, tasks.length),
      avgTimeStr: diffs.length ? (h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`) : '-',
      chartData,
    });
  } catch (error) {
    console.error('Error generating reports:', error);
    res.status(500).json({ error: 'ไม่สามารถสร้างรายงานได้' });
  }
});

// GET ผู้ป่วยรายเดียว พร้อมรอบ ประวัติ เหตุการณ์ผิดปกติ
router.get('/:id', async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: {
          orderBy: { scheduledAt: 'asc' },
          include: { ...taskInclude, scheduleChanges: { orderBy: { changedAt: 'desc' } } },
        },
        incidents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!patient) return res.status(404).json({ error: 'ไม่พบผู้ป่วย' });

    const ids = [patient.createdById, patient.updatedById, ...patient.tasks.flatMap((t) => t.scheduleChanges.map((c) => c.changedById))].filter(Boolean);
    const nurses = await prisma.nurse.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    const nameOf = Object.fromEntries(nurses.map((n) => [n.id, n.name]));

    const now = new Date();
    res.json({
      ...patient,
      createdByName: nameOf[patient.createdById] || null,
      updatedByName: nameOf[patient.updatedById] || null,
      tasks: patient.tasks.map((t) => ({
        ...decorateTask(t, now),
        scheduleChanges: t.scheduleChanges.map((c) => ({ ...c, changedByName: nameOf[c.changedById] || null })),
      })),
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ป่วยได้' });
  }
});

// POST ลงทะเบียนผู้ป่วย (+ เวลาลุกเดินรอบแรก ถ้าส่งมา)
router.post('/', async (req, res) => {
  try {
    const data = pickPatientFields(req.body);
    const err = validatePatient(data, true);
    if (err) return res.status(400).json({ error: err });

    const existing = await prisma.patient.findUnique({ where: { an: data.an } });
    if (existing) return res.status(400).json({ error: `AN ${data.an} มีอยู่ในระบบแล้ว (${existing.name})` });

    let firstAt = null;
    if (req.body.firstScheduledAt) {
      firstAt = new Date(req.body.firstScheduledAt);
      if (Number.isNaN(firstAt.getTime())) return res.status(400).json({ error: 'เวลาลุกเดินไม่ถูกต้อง' });
    }

    const patient = await prisma.patient.create({
      data: {
        ...data,
        createdById: req.user.id,
        tasks: firstAt ? { create: { roundNo: 1, scheduledAt: firstAt, createdById: req.user.id } } : undefined,
      },
    });
    await audit(req, 'CREATE', 'Patient', patient.id, { an: patient.an, name: patient.name, firstScheduledAt: firstAt });
    res.status(201).json(patient);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'ไม่สามารถลงทะเบียนผู้ป่วยได้' });
  }
});

// PUT แก้ไขข้อมูลผู้ป่วย
router.put('/:id', async (req, res) => {
  try {
    const data = pickPatientFields(req.body);
    const err = validatePatient(data, false);
    if (err) return res.status(400).json({ error: err });

    const before = await prisma.patient.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: 'ไม่พบผู้ป่วย' });
    if (data.an && data.an !== before.an) {
      const dup = await prisma.patient.findUnique({ where: { an: data.an } });
      if (dup) return res.status(400).json({ error: `AN ${data.an} มีอยู่ในระบบแล้ว (${dup.name})` });
    }

    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: { ...data, updatedById: req.user.id },
    });
    const changes = {};
    for (const k of Object.keys(data)) {
      const a = before[k] instanceof Date ? before[k].toISOString() : before[k];
      const b = patient[k] instanceof Date ? patient[k].toISOString() : patient[k];
      if (a !== b) changes[k] = { from: a, to: b };
    }
    await audit(req, 'UPDATE', 'Patient', patient.id, changes);
    res.json(patient);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'ไม่สามารถอัปเดตข้อมูลผู้ป่วยได้' });
  }
});

// DELETE ผู้ป่วย (พยาบาลทุกคนลบได้)
router.delete('/:id', async (req, res) => {
  try {
    const p = await prisma.patient.delete({ where: { id: req.params.id } });
    await audit(req, 'DELETE', 'Patient', p.id, { an: p.an, name: p.name });
    res.json({ message: 'ลบข้อมูลผู้ป่วยเรียบร้อย' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'ไม่สามารถลบข้อมูลผู้ป่วยได้' });
  }
});

export default router;
