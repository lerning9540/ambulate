// ใส่เกณฑ์ Checklist ตั้งต้นตามตารางของโรงพยาบาล (รันซ้ำได้ ไม่ทับค่าที่หัวหน้าเวรแก้ไว้)
// ใช้: npm run db:seed
import prisma from './db.js';

const G1 = 'สัญญาณชีพปกติ';
const items = [
  { code: 'TEMP', groupNo: 1, groupLabel: G1, label: 'อุณหภูมิ', kind: 'NUMBER', unit: '°C', minValue: 36, maxValue: 38, sortOrder: 1 },
  { code: 'SBP', groupNo: 1, groupLabel: G1, label: 'SBP (ความดันตัวบน)', kind: 'NUMBER', unit: 'mmHg', minValue: 90, maxValue: 180, sortOrder: 2 },
  { code: 'DBP', groupNo: 1, groupLabel: G1, label: 'DBP (ความดันตัวล่าง)', kind: 'NUMBER', unit: 'mmHg', sortOrder: 3, description: 'ใช้คำนวณ MAP' },
  { code: 'MAP', groupNo: 1, groupLabel: G1, label: 'MAP (คำนวณอัตโนมัติ)', kind: 'MAP', unit: 'mmHg', minValue: 60, minInclusive: true, maxValue: 110, sortOrder: 4 },
  { code: 'HR', groupNo: 1, groupLabel: G1, label: 'HR', kind: 'NUMBER', unit: 'ครั้ง/นาที', minValue: 40, maxValue: 120, sortOrder: 5 },
  { code: 'RR', groupNo: 1, groupLabel: G1, label: 'RR', kind: 'NUMBER', unit: 'ครั้ง/นาที', maxValue: 35, sortOrder: 6 },
  { code: 'SPO2', groupNo: 1, groupLabel: G1, label: 'O₂ Sat', kind: 'NUMBER', unit: '%', minValue: 95, minInclusive: true, copdMinValue: 92, sortOrder: 7, description: 'ผู้ป่วย COPD ใช้เกณฑ์ ≥ 92%' },
  { code: 'NO_CONFUSION', groupNo: 2, groupLabel: 'ไม่มีอาการสับสนหรือก้าวร้าวรุนแรง', label: 'ไม่มีอาการสับสนหรือก้าวร้าวรุนแรง', kind: 'BOOL', description: 'ต้องไม่มีอาการทั้งสองลักษณะ' },
  { code: 'NO_CHEST_PAIN', groupNo: 3, groupLabel: 'ไม่มีอาการแน่นหน้าอก หรือ EKG ปกติ', label: 'ไม่มีอาการแน่นหน้าอก หรือ EKG ปกติ', kind: 'BOOL' },
  { code: 'PAIN', groupNo: 4, groupLabel: 'ระดับความปวด', label: 'Pain score', kind: 'NUMBER', unit: '/10', minValue: 0, minInclusive: true, maxValue: 3, maxInclusive: true, description: 'ไม่เกิน 3/10' },
  { code: 'DRAIN', groupNo: 5, groupLabel: 'สายระบาย', label: 'ไม่มีสายระบายที่เป็นอุปสรรคต่อการเคลื่อนไหว', kind: 'BOOL' },
  { code: 'WOUND', groupNo: 6, groupLabel: 'แผลผ่าตัดและผลเลือด', label: 'แผลไม่มีเลือดซึมผิดปกติ หรือ Hct ≥ 25% หรือ Plt > 20,000', kind: 'BOOL' },
  { code: 'CAP_REFILL', groupNo: 7, groupLabel: 'การไหลเวียนเลือดที่ปลายนิ้ว', label: 'Capillary refill time', kind: 'NUMBER', unit: 'วินาที', maxValue: 3 },
  { code: 'NO_ORTHOSTATIC', groupNo: 8, groupLabel: 'อาการผิดปกติเมื่อเปลี่ยนท่า', label: 'ไม่มีวิงเวียน บ้านหมุน หน้ามืด ใจสั่น หรือหายใจหอบเหนื่อยผิดปกติ', kind: 'BOOL' },
];

async function main() {
  for (const item of items) {
    await prisma.checklistItem.upsert({ where: { code: item.code }, update: {}, create: item });
  }
  console.log(`Checklist: ${items.length} items ready`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
