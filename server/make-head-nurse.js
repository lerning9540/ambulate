// ตั้งผู้ใช้เป็นหัวหน้าเวร: npm run make-head -- <username>
import prisma from './db.js';

const username = process.argv[2];
if (!username) {
  console.error('ใช้: npm run make-head -- <username>');
  process.exit(1);
}
const nurse = await prisma.nurse.update({ where: { username }, data: { role: 'HEAD_NURSE' } }).catch(() => null);
console.log(nurse ? `${username} เป็นหัวหน้าเวรแล้ว (ต้องออกจากระบบแล้วเข้าใหม่)` : `ไม่พบผู้ใช้ ${username}`);
await prisma.$disconnect();
