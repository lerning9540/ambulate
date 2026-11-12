import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { patientAPI } from '../services/api';
import Header from '../components/Header';
import { StatusPill, fmtTime, todayLocal } from '../lib/status';
import { Search } from 'lucide-react';

// กลุ่มสถานะบน Dashboard (spec ข้อ 7.2) ผู้ป่วย 1 คนอยู่ได้หลายกลุ่ม
const GROUPS = ['OVERDUE', 'DUE', 'NOT_READY', 'READY', 'FOLLOW_UP', 'UPCOMING', 'COMPLETED_LATE', 'COMPLETED_ON_TIME'];

function inGroup(task, group) {
  if (group === 'READY' || group === 'NOT_READY') return task.readiness === group;
  return task.status === group;
}

export default function Dashboard() {
  const [date, setDate] = useState(todayLocal());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setData(await patientAPI.getDashboard(date));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 15000);
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchData]);

  const s = data?.summary;
  const match = (p) => !q || p.an.includes(q) || p.name.includes(q);
  const tasks = (data?.tasks || []).filter((t) => match(t.patient));
  const incidents = (data?.incidents || []).filter((i) => match(i.patient));

  const cards = s
    ? [
        { label: 'ผู้ป่วยที่มีแผนลุกเดิน', value: s.patientsToday, cls: 'pending' },
        { label: 'ดำเนินการเสร็จแล้ว', value: s.completed, cls: 'done' },
        { label: 'เสร็จตรงเวลา', value: s.onTime, cls: 'ready' },
        { label: 'เสร็จล่าช้า', value: s.late, cls: 'time' },
        { label: 'ยังไม่ได้ดำเนินการ', value: s.notDone, cls: 'pending', note: s.overdue ? `เกินกำหนด ${s.overdue}` : null },
        { label: 'ผู้ป่วยยังไม่พร้อม', value: s.notReadyPatients, cls: 'time' },
        { label: 'เหตุการณ์ต้องติดตาม', value: s.openIncidents, cls: 'done' },
      ]
    : [];

  return (
    <>
      <Header title="Dashboard" showBell={true} />

      <div className="page-content">
        <div className="date-picker">
          <span>วันที่</span>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ border: 'none', fontSize: 14, fontFamily: 'inherit' }} />
        </div>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36, marginBottom: 0 }} placeholder="ค้นหา AN หรือชื่อ" value={q} onChange={(e) => setQ(e.target.value.trim())} />
        </div>

        <h2 className="section-title">สรุปกิจกรรมประจำวัน</h2>
        <div className="summary-grid">
          {cards.map((c) => (
            <div key={c.label} className={`summary-card ${c.cls}`}>
              <div className="summary-card-title">{c.label}</div>
              <div className="summary-card-value">{c.value}</div>
              {c.note && <div style={{ fontSize: 11, color: 'var(--status-red)', fontWeight: 600 }}>{c.note}</div>}
            </div>
          ))}
        </div>

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>กำลังโหลดข้อมูล...</div>
        ) : tasks.length === 0 && incidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>ไม่มีกิจกรรมในวันนี้</div>
        ) : (
          GROUPS.map((g) => {
            const rows =
              g === 'FOLLOW_UP'
                ? incidents.map((i) => ({ key: i.id, patient: i.patient, time: null, detail: i.detail, status: 'FOLLOW_UP' }))
                : tasks.filter((t) => inGroup(t, g)).map((t) => ({ key: t.id + g, taskId: t.id, patient: t.patient, time: t.scheduledAt, round: t.roundNo, status: t.status, readiness: t.readiness }));
            if (rows.length === 0) return null;
            return (
              <div key={g} style={{ marginBottom: 16 }}>
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusPill status={g} /> <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{rows.length} รายการ</span>
                </h2>
                <div className="patient-list">
                  {rows.map((r) => (
                    <Link to={r.round && !r.status.startsWith('COMPLETED') ? `/task/${r.taskId}/${r.readiness === 'READY' ? 'ambulation' : 'assessment'}` : `/patient/${r.patient.id}`} key={r.key} className="patient-row" style={{ alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="patient-row-info">
                          {r.patient.bed && <span className="patient-row-bed">เตียง {r.patient.bed}</span>}
                          <span className="patient-row-name" style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.patient.name}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          AN {r.patient.an}
                          {r.time && ` · รอบ ${r.round} เวลา ${fmtTime(r.time)} น.`}
                          {r.detail && ` · ${r.detail}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <StatusPill status={r.status} small />
                        {r.readiness && g !== r.readiness && <StatusPill status={r.readiness} small />}
                        {!r.status.startsWith('COMPLETED') && r.status !== 'FOLLOW_UP' && (
                          <span style={{ fontSize: 12, color: 'var(--primary-blue)', fontWeight: 600 }}>
                            {r.readiness === 'READY' ? 'บันทึกผล ›' : 'ประเมิน ›'}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
