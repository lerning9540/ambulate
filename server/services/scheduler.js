import prisma from '../db.js';
import { LATE_AFTER_MS, isAfterDischarge } from './status.js';

// แจ้งเตือนตาม spec ข้อ 4 และคำสั่งเพิ่มเติม (เตือนทุก 30 นาที)
// - ถึงเวลา: แจ้ง 1 ครั้ง
// - ยังไม่บันทึกผล: เตือนซ้ำทุก 30 นาที (หยุดเตือนหลัง 24 ชม. จากเวลาที่กำหนด เพื่อไม่ให้เตือนค้างข้ามเดือน)
// - เกิน 1 ชม. ยังไม่บันทึกผล: แจ้งล่าช้า (Late/OVERDUE) 1 ครั้ง
// - บันทึกผลแล้ว: ไม่แจ้งอีก
// หมายเหตุ: Render แผนฟรีจะหลับเมื่อไม่มีคนใช้ จึงเรียก checkAndNotify ทุกครั้งที่มี request ด้วย (สูงสุด 1 ครั้ง/20 วินาที)

const REPEAT_EVERY_MS = 30 * 60 * 1000;
const REPEAT_WINDOW_MS = 24 * 60 * 60 * 1000;

let running = false;
let lastRun = 0;

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });

export async function checkAndNotify() {
  if (running) return;
  running = true;
  lastRun = Date.now();
  try {
    const now = new Date();

    const dueTasks = await prisma.ambulationTask.findMany({
      where: { record: null, dueNotifiedAt: null, scheduledAt: { lte: now } },
      include: { patient: true },
    });
    for (const task of dueTasks.filter((t) => !isAfterDischarge(t, t.patient.dischargedHomeAt))) {
      await prisma.$transaction([
        prisma.notification.create({
          data: {
            patientId: task.patientId,
            taskId: task.id,
            type: 'DUE',
            message: `ถึงเวลากระตุ้นลุกเดิน ${task.patient.name} (AN: ${task.patient.an}) รอบที่ ${task.roundNo} เวลา ${fmtTime(task.scheduledAt)} น.`,
          },
        }),
        prisma.ambulationTask.update({
          where: { id: task.id },
          data: { dueNotifiedAt: now },
        }),
      ]);
    }

    // เตือนซ้ำทุก 30 นาที จนกว่าจะบันทึกผล (ไม่เตือนเกิน 24 ชม. หลังเวลาที่กำหนด)
    const repeatTasks = await prisma.ambulationTask.findMany({
      where: {
        record: null,
        dueNotifiedAt: { not: null },
        scheduledAt: { gte: new Date(now.getTime() - REPEAT_WINDOW_MS), lte: new Date(now.getTime() - REPEAT_EVERY_MS) },
      },
      include: { patient: true },
    });
    for (const task of repeatTasks.filter((t) => !isAfterDischarge(t, t.patient.dischargedHomeAt))) {
      const last = await prisma.notification.findFirst({
        where: { taskId: task.id },
        orderBy: { sentAt: 'desc' },
      });
      if (last && now.getTime() - new Date(last.sentAt).getTime() < REPEAT_EVERY_MS) continue;
      await prisma.notification.create({
        data: {
          patientId: task.patientId,
          taskId: task.id,
          type: 'DUE',
          message: `เตือนซ้ำ: กระตุ้นลุกเดิน ${task.patient.name} (AN: ${task.patient.an}) รอบที่ ${task.roundNo} เวลา ${fmtTime(task.scheduledAt)} น. ยังไม่บันทึกผล`,
        },
      });
    }

    const lateTasks = await prisma.ambulationTask.findMany({
      where: {
        record: null,
        lateNotifiedAt: null,
        scheduledAt: { lte: new Date(now.getTime() - LATE_AFTER_MS) },
      },
      include: { patient: true },
    });
    for (const task of lateTasks.filter((t) => !isAfterDischarge(t, t.patient.dischargedHomeAt))) {
      await prisma.$transaction([
        prisma.notification.create({
          data: {
            patientId: task.patientId,
            taskId: task.id,
            type: 'LATE',
            message: `⚠️ ล่าช้า (Late): ${task.patient.name} (AN: ${task.patient.an}) รอบที่ ${task.roundNo} เวลา ${fmtTime(task.scheduledAt)} น. เกิน 1 ชม. ยังไม่บันทึกผล`,
          },
        }),
        prisma.ambulationTask.update({ where: { id: task.id }, data: { lateNotifiedAt: now } }),
      ]);
    }
  } catch (error) {
    console.error('Scheduler error:', error);
  } finally {
    running = false;
  }
}

export function notifyOnRequest(req, res, next) {
  if (Date.now() - lastRun > 20 * 1000) checkAndNotify();
  next();
}

export function startScheduler() {
  console.log('Scheduler started - checking every 60 seconds');
  checkAndNotify();
  setInterval(checkAndNotify, 60 * 1000);
}
