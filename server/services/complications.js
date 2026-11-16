// รายการภาวะแทรกซ้อนที่ประเมินท้ายรอบเดิน (ใช้ร่วมกันทั้งการบันทึก Dashboard และรายงาน)
export const COMPLICATION_LABELS = {
  CONSTIPATION: 'ท้องผูก (Constipation)',
  ABDOMINAL_DISTENSION: 'ท้องอืด (Abdominal Distension)',
  URINARY_RETENTION: 'ปัสสาวะคั่ง (Urinary Retention)',
  ORTHOSTATIC_HYPOTENSION: 'ความดันโลหิตต่ำขณะเปลี่ยนท่า (Orthostatic Hypotension)',
  OTHER: 'อื่นๆ',
};

// คืนเฉพาะรหัสที่รู้จักและไม่ซ้ำ
export function cleanComplications(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list)].filter((c) => Object.hasOwn(COMPLICATION_LABELS, c));
}
