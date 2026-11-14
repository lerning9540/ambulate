// กฎสถานะตรงเวลา/ล่าช้า (spec ข้อ 8)
// - ใช้ Scheduled Time เป็นเวลาอ้างอิง ล่าช้าเมื่อเกิน 1 ชั่วโมง
// - ตรงเวลา/ล่าช้าคิดจากเวลาเริ่มกิจกรรมจริง (startTime) ไม่ใช่เวลากดบันทึก
// - เริ่มก่อน scheduled + 1 ชม. = ตรงเวลา, ตั้งแต่ scheduled + 1 ชม. ขึ้นไป = ล่าช้า

export const LATE_AFTER_MS = 60 * 60 * 1000;

export function lateAt(task) {
  return new Date(new Date(task.scheduledAt).getTime() + LATE_AFTER_MS);
}

// รอบที่อยู่หลังวันที่ผู้ป่วยกลับบ้าน และยังไม่บันทึกผล = ไม่ต้องติดตามแล้ว
export function isAfterDischarge(task, dischargedHomeAt) {
  return !task.record && !!dischargedHomeAt && new Date(task.scheduledAt) > new Date(dischargedHomeAt);
}

// สถานะหลักของกิจกรรม
export function taskStatus(task, now = new Date(), dischargedHomeAt = task.patient?.dischargedHomeAt) {
  if (task.record) {
    return new Date(task.record.startTime) < lateAt(task) ? 'COMPLETED_ON_TIME' : 'COMPLETED_LATE';
  }
  if (isAfterDischarge(task, dischargedHomeAt)) return 'AFTER_DISCHARGE';
  if (now < new Date(task.scheduledAt)) return 'UPCOMING';
  if (now >= lateAt(task)) return 'OVERDUE';
  return 'DUE';
}

// ผลประเมินความพร้อมล่าสุด (READY / NOT_READY / null)
export function readiness(task) {
  if (task.record || !task.assessments || task.assessments.length === 0) return null;
  const latest = [...task.assessments].sort((a, b) => new Date(b.assessedAt) - new Date(a.assessedAt))[0];
  return latest.result;
}

export function decorateTask(task, now = new Date(), dischargedHomeAt = task.patient?.dischargedHomeAt) {
  return { ...task, status: taskStatus(task, now, dischargedHomeAt), readiness: readiness(task) };
}

// ช่วงวันที่ตามเวลาไทย
export function bangkokDayRange(dateStr) {
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  if (Number.isNaN(start.getTime())) return null;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function todayBangkok() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
