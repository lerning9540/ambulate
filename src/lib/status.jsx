import { format } from 'date-fns';
import { th } from 'date-fns/locale';

// ชื่อสถานะ (ไทย + อังกฤษกำกับ) และสี
export const STATUS = {
  UPCOMING: { label: 'ยังไม่ถึงเวลา', en: 'UPCOMING', color: '#004085', bg: '#cce5ff' },
  DUE: { label: 'ถึงเวลา', en: 'DUE', color: '#b45309', bg: '#ffe8cc' },
  READY: { label: 'พร้อมลุกเดิน', en: 'READY', color: '#155724', bg: '#d4edda' },
  NOT_READY: { label: 'ยังไม่พร้อม', en: 'NOT READY', color: '#a71d2a', bg: '#f8d7da' },
  COMPLETED_ON_TIME: { label: 'เสร็จตรงเวลา', en: 'COMPLETED ON TIME', color: '#1e7e34', bg: '#e3f4e6' },
  COMPLETED_LATE: { label: 'เสร็จล่าช้า', en: 'COMPLETED LATE', color: '#856404', bg: '#fff3cd' },
  OVERDUE: { label: 'เกินกำหนด', en: 'OVERDUE', color: '#ffffff', bg: '#dc3545' },
  FOLLOW_UP: { label: 'ต้องติดตาม', en: 'FOLLOW-UP', color: '#6f42c1', bg: '#ece3fa' },
  AFTER_DISCHARGE: { label: 'กลับบ้านแล้ว', en: 'DISCHARGED', color: '#1e7e34', bg: '#e3f4e6' },
};

export function StatusPill({ status, small }) {
  const s = STATUS[status];
  if (!s) return null;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: 999,
        padding: small ? '2px 8px' : '4px 10px',
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label} · {s.en}
    </span>
  );
}

export const fmtDateTime = (d) => (d ? format(new Date(d), 'd MMM yyyy HH:mm', { locale: th }) : '-');
export const fmtTime = (d) => (d ? format(new Date(d), 'HH:mm', { locale: th }) : '-');

// ค่าสำหรับ <input type="datetime-local"> ตามเวลาเครื่อง
export function toLocalInput(d) {
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

export function todayLocal() {
  return toLocalInput(new Date()).slice(0, 10);
}
