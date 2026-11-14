import React from 'react';
import Header from '../components/Header';

const GUIDE = [
  'วิธีเพิ่มข้อมูลผู้ป่วย',
  'วิธีตั้งเวลาการลุกเดิน',
  'วิธีประเมิน Checklist ทั้ง 8 ข้อ',
  'วิธีบันทึกผลการลุกเดิน',
  'วิธีตรวจสอบ Dashboard',
];

export default function Help() {
  return (
    <>
      <Header title="ช่วยเหลือและสนับสนุน" showBack />
      <div className="page-content">
        <div className="detail-card" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, color: 'var(--primary-blue)', marginBottom: 8 }}>1. คู่มือการใช้งาน</h3>
          <ul style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }}>
            {GUIDE.map((g) => <li key={g}>{g}</li>)}
          </ul>
        </div>

        <div className="detail-card">
          <h3 style={{ fontSize: 15, color: 'var(--primary-blue)', marginBottom: 8 }}>2. ติดต่อผู้ดูแลระบบ</h3>
          <div style={{ fontSize: 14, lineHeight: 1.9 }}>
            <div>ผู้รับผิดชอบระบบ: นายนิธิกานต์ ทองทักษิณ</div>
            <div>เบอร์โทรศัพท์: <a href="tel:0924196299">092 4196299</a></div>
            <div>อีเมล: <a href="mailto:66102301068@gmail.com">66102301068@gmail.com</a></div>
          </div>
        </div>
      </div>
    </>
  );
}
