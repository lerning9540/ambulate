// ตรรกะประเมิน Checklist ใช้ร่วมกันทั้งฝั่งหน้าเว็บ (แสดงสีเขียว/แดง) และ server (บันทึกผลจริง)

const toNum = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// คำนวณ MAP จาก SBP และ DBP
export function computeMap(values) {
  const sbp = toNum(values.SBP);
  const dbp = toNum(values.DBP);
  if (sbp === null || dbp === null) return null;
  return Math.round(((sbp + 2 * dbp) / 3) * 10) / 10;
}

function rangeText(item, isCopd) {
  const min = isCopd && item.copdMinValue != null ? item.copdMinValue : item.minValue;
  const parts = [];
  if (min != null) parts.push(`${item.minInclusive || (isCopd && item.copdMinValue != null) ? '≥' : '>'} ${min}`);
  if (item.maxValue != null) parts.push(`${item.maxInclusive ? '≤' : '<'} ${item.maxValue}`);
  return parts.join(' และ ') + (item.unit ? ` ${item.unit}` : '');
}

export function criteriaText(item, isCopd = false) {
  if (item.kind === 'BOOL') return item.description || 'ผ่าน';
  const t = rangeText(item, isCopd);
  return t || 'บันทึกค่า (ไม่มีเกณฑ์)';
}

// ประเมิน 1 รายการ: คืนค่า { value, passed } โดย passed = null ถ้ายังไม่ได้กรอก
export function evaluateItem(item, values, isCopd = false) {
  if (item.kind === 'BOOL') {
    const v = values[item.code];
    if (v === undefined || v === null || v === '') return { value: null, passed: null };
    return { value: v === true || v === 'true', passed: v === true || v === 'true' };
  }
  const value = item.kind === 'MAP' ? computeMap(values) : toNum(values[item.code]);
  if (value === null) return { value: null, passed: null };
  const useCopd = isCopd && item.copdMinValue != null;
  const min = useCopd ? item.copdMinValue : item.minValue;
  const minInc = useCopd ? true : item.minInclusive;
  let passed = true;
  if (min != null) passed = passed && (minInc ? value >= min : value > min);
  if (item.maxValue != null) passed = passed && (item.maxInclusive ? value <= item.maxValue : value < item.maxValue);
  return { value, passed };
}

// ประเมินทั้งชุด: ไม่ผ่านแม้ 1 ข้อ = NOT_READY, กรอกไม่ครบ = incomplete
export function evaluateChecklist(items, values, isCopd = false) {
  const answers = [];
  const failed = [];
  const missing = [];
  for (const item of items) {
    const { value, passed } = evaluateItem(item, values, isCopd);
    answers.push({ code: item.code, groupNo: item.groupNo, label: item.label, value, passed });
    if (passed === null) missing.push(item.label);
    else if (!passed) {
      failed.push({
        code: item.code,
        label: `${item.groupNo}. ${item.label}`,
        reason: item.kind === 'BOOL' ? 'ไม่ผ่านเกณฑ์' : `ค่า ${value} ไม่อยู่ในเกณฑ์ (${criteriaText(item, isCopd)})`,
        advice: item.advice || null,
      });
    }
  }
  return {
    answers,
    failed,
    missing,
    complete: missing.length === 0,
    result: missing.length === 0 && failed.length === 0 ? 'READY' : 'NOT_READY',
  };
}
