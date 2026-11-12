import React, { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import Header from '../components/Header';
import { fmtDateTime } from '../lib/status';

const ACTION = { CREATE: 'เพิ่ม', UPDATE: 'แก้ไข', DELETE: 'ลบ' };
const ENTITY = {
  Patient: 'ผู้ป่วย',
  AmbulationTask: 'รอบลุกเดิน',
  Assessment: 'การประเมิน',
  AmbulationRecord: 'ผลการลุกเดิน',
  Incident: 'เหตุการณ์ผิดปกติ',
  ChecklistItem: 'เกณฑ์ Checklist',
};

// ประวัติการเพิ่ม/แก้ไขข้อมูล (หัวหน้าเวร)
export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    auditAPI.getAll().then(setLogs).catch((e) => console.error(e));
  }, []);

  return (
    <>
      <Header title="ประวัติการแก้ไข" showBack={true} />
      <div className="page-content">
        {logs.map((l) => (
          <div key={l.id} className="detail-card" style={{ padding: 12, fontSize: 13 }}>
            <div>
              <b>{l.nurseName || '-'}</b> {ACTION[l.action] || l.action} {ENTITY[l.entity] || l.entity}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDateTime(l.createdAt)}</div>
            {l.detail && <div style={{ fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>{JSON.stringify(l.detail)}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
