import prisma from '../db.js';

// บันทึกว่าใครเพิ่ม/แก้ไข/ลบอะไร
export async function audit(req, action, entity, entityId, detail = null) {
  try {
    await prisma.auditLog.create({
      data: {
        nurseId: req.user?.id || null,
        nurseName: req.user?.name || null,
        action,
        entity,
        entityId: entityId || null,
        detail: detail ?? undefined,
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}
