import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { patientAPI } from '../services/api';
import Header from '../components/Header';
import { StatusPill, fmtDateTime } from '../lib/status';
import { Search, UserPlus } from 'lucide-react';

// รายชื่อผู้ป่วยทั้งหมด ค้นหาด้วย AN หรือชื่อ
export default function PatientList() {
  const [q, setQ] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      patientAPI
        .getAll(q)
        .then(setPatients)
        .catch((e) => console.error(e))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <>
      <Header title="ผู้ป่วย" />
      <div className="page-content">
        <Link to="/register" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', marginBottom: 16 }}>
          <UserPlus size={18} /> ลงทะเบียนผู้ป่วยใหม่
        </Link>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36, marginBottom: 0 }} placeholder="ค้นหา AN หรือชื่อ" value={q} onChange={(e) => setQ(e.target.value.trim())} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>กำลังโหลด...</div>
        ) : patients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>ไม่พบผู้ป่วย</div>
        ) : (
          <div className="patient-list">
            {patients.map((p) => (
              <Link to={`/patient/${p.id}`} key={p.id} className="patient-row" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    AN {p.an}
                    {p.bed && ` · เตียง ${p.bed}`} · {p.taskCount} รอบ
                    {p.nextTask && ` · รอบถัดไป ${fmtDateTime(p.nextTask.scheduledAt)}`}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {p.nextTask && <StatusPill status={p.nextTask.status} small />}
                  {p.openIncidents > 0 && <StatusPill status="FOLLOW_UP" small />}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
