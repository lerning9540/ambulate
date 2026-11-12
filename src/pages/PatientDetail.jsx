import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { patientAPI, taskAPI, incidentAPI } from '../services/api';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { StatusPill, fmtDateTime, toLocalInput } from '../lib/status';
import { User, Plus, Pencil } from 'lucide-react';

export default function PatientDetail({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTime, setNewTime] = useState('');
  const [editing, setEditing] = useState(null); // { taskId, value }

  const load = useCallback(async () => {
    try {
      setPatient(await patientAPI.getById(id));
    } catch (error) {
      console.error('Failed to fetch patient details:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="app-container flex-center">กำลังโหลด...</div>;
  if (!patient) return <div className="app-container flex-center">ไม่พบผู้ป่วย</div>;

  const addRound = async () => {
    if (!newTime) return showToast('กรุณาเลือกวันเวลา', 'error');
    try {
      await taskAPI.create({ patientId: id, scheduledAt: new Date(newTime).toISOString() });
      setNewTime('');
      showToast('เพิ่มรอบลุกเดินแล้ว');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const saveTime = async () => {
    try {
      await taskAPI.reschedule(editing.taskId, new Date(editing.value).toISOString());
      setEditing(null);
      showToast('แก้เวลาแล้ว (เก็บประวัติไว้)');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const closeIncident = async (incident) => {
    const note = window.prompt('บันทึกการติดตาม/ปิดเรื่อง', '');
    if (note === null) return;
    try {
      await incidentAPI.close(incident.id, note);
      showToast('ปิดเรื่องแล้ว');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const deletePatient = async () => {
    if (!window.confirm(`ลบผู้ป่วย ${patient.name} (AN ${patient.an}) และข้อมูลทั้งหมด?`)) return;
    try {
      await patientAPI.delete(id);
      showToast('ลบข้อมูลผู้ป่วยแล้ว');
      navigate('/patients');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const info = [
    ['ชนิดการผ่าตัด', patient.surgeryType],
    ['เวลาออกจากห้องผ่าตัด', fmtDateTime(patient.orDischargeAt)],
    ['สาย/อุปกรณ์', patient.linesDevices || '-'],
    ['ข้อจำกัดตามคำสั่งแพทย์', patient.doctorRestriction || '-'],
    ['หมายเหตุ', patient.note || '-'],
    ['ผู้ลงทะเบียน', patient.createdByName || '-'],
    ...(patient.updatedByName ? [['แก้ไขล่าสุดโดย', `${patient.updatedByName} (${fmtDateTime(patient.updatedAt)})`]] : []),
  ];

  return (
    <>
      <Header
        title="รายละเอียดผู้ป่วย"
        showBack={true}
        rightElement={<Pencil className="header-icon" size={20} onClick={() => navigate(`/patient/${id}/edit`)} style={{ cursor: 'pointer' }} />}
      />

      <div className="page-content">
        <div className="detail-card">
          <div className="profile-header">
            <div className="profile-avatar">
              <User size={32} />
            </div>
            <div className="profile-info">
              <h3>AN {patient.an}</h3>
              <h2>{patient.name}</h2>
              <p>
                {patient.bed ? `เตียง ${patient.bed} | ` : ''}อายุ {patient.age} ปี | {patient.gender === 'M' ? 'ชาย' : 'หญิง'}
                {patient.isCopd ? ' | COPD' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="detail-card" style={{ padding: '20px 16px' }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>ข้อมูลการผ่าตัด</h2>
          {info.map(([k, v]) => (
            <div className="info-row" key={k}>
              <span className="info-label">{k}</span>
              <span className="info-value" style={{ textAlign: 'right', maxWidth: '60%' }}>{v}</span>
            </div>
          ))}
        </div>

        {patient.incidents.some((i) => i.status === 'OPEN') && (
          <div className="detail-card" style={{ padding: 16, borderLeft: '4px solid #6f42c1' }}>
            <h2 className="section-title" style={{ marginTop: 0 }}>เหตุการณ์ผิดปกติที่ต้องติดตาม</h2>
            {patient.incidents
              .filter((i) => i.status === 'OPEN')
              .map((i) => (
                <div key={i.id} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600 }}>{i.detail}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {fmtDateTime(i.createdAt)} โดย {i.createdByName || '-'}
                  </div>
                  <button className="btn" style={{ marginTop: 6, padding: '6px 12px', width: 'auto', fontSize: 13, background: '#ece3fa', color: '#6f42c1' }} onClick={() => closeIncident(i)}>
                    ติดตามแล้ว ปิดเรื่อง
                  </button>
                </div>
              ))}
          </div>
        )}

        <h2 className="section-title">ตารางการลุกเดิน</h2>
        {patient.tasks.length === 0 && <div style={{ color: 'var(--text-muted)', marginBottom: 12 }}>ยังไม่มีรอบลุกเดิน</div>}
        {patient.tasks.map((t) => {
          const latest = t.assessments[0];
          return (
            <div key={t.id} className="schedule-card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <span className="schedule-title" style={{ margin: 0 }}>รอบที่ {t.roundNo}</span>
                <StatusPill status={t.status} small />
              </div>

              {editing?.taskId === t.id ? (
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="datetime-local" className="form-input" style={{ marginBottom: 0 }} value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} />
                  <button className="btn btn-primary" style={{ width: 'auto', padding: '6px 12px' }} onClick={saveTime}>บันทึก</button>
                  <button className="btn" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => setEditing(null)}>ยกเลิก</button>
                </div>
              ) : (
                <div className="info-row">
                  <span className="info-label">เวลาที่กำหนด</span>
                  <span className="info-value">
                    {fmtDateTime(t.scheduledAt)} น.
                    {!t.record && (
                      <Pencil size={14} style={{ marginLeft: 8, cursor: 'pointer', color: 'var(--primary-blue)' }} onClick={() => setEditing({ taskId: t.id, value: toLocalInput(t.scheduledAt) })} />
                    )}
                  </span>
                </div>
              )}

              {t.scheduleChanges.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 8px' }}>
                  ประวัติแก้เวลา:
                  {t.scheduleChanges.map((c) => (
                    <div key={c.id}>
                      {fmtDateTime(c.oldAt)} → {fmtDateTime(c.newAt)} โดย {c.changedByName || '-'} ({fmtDateTime(c.changedAt)})
                    </div>
                  ))}
                </div>
              )}

              {latest && (
                <div className="info-row">
                  <span className="info-label">ประเมินล่าสุด</span>
                  <span className="info-value" style={{ textAlign: 'right' }}>
                    <StatusPill status={latest.result} small />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {fmtDateTime(latest.assessedAt)} โดย {latest.assessedByName || '-'}
                    </div>
                  </span>
                </div>
              )}
              {latest?.result === 'NOT_READY' && (
                <div style={{ fontSize: 12, color: 'var(--status-red)', marginBottom: 8 }}>
                  {(latest.failedReasons || []).map((f) => (
                    <div key={f.code}>• {f.label}: {f.reason}{f.advice ? ` — ${f.advice}` : ''}</div>
                  ))}
                </div>
              )}

              {t.record ? (
                <div style={{ fontSize: 13, marginTop: 8 }}>
                  <div>เดินจริง {fmtDateTime(t.record.startTime)} – {fmtDateTime(t.record.endTime)}</div>
                  <div>
                    {t.record.distance != null && `ระยะทาง ${t.record.distance} เมตร `}
                    {t.record.duration != null && `ใช้เวลา ${t.record.duration} นาที `}
                    · {t.record.assistLevel}
                    {t.record.stoppedEarly && ' · หยุดก่อนกำหนด'}
                  </div>
                  {t.record.symptomsDuring && <div>ระหว่างเดิน: {t.record.symptomsDuring}</div>}
                  {t.record.symptomsAfter && <div>หลังเดิน: {t.record.symptomsAfter}</div>}
                  {t.record.complication && <div style={{ color: '#6f42c1' }}>เหตุการณ์ผิดปกติ: {t.record.complication}</div>}
                  {t.record.note && <div>หมายเหตุ: {t.record.note}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    บันทึกโดย {t.record.recordedByName || '-'} ({fmtDateTime(t.record.recordedAt)})
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Link to={`/task/${t.id}/assessment`} className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none', padding: 10 }}>
                    ประเมินความพร้อม
                  </Link>
                  {t.readiness === 'READY' && (
                    <Link to={`/task/${t.id}/ambulation`} className="btn btn-success" style={{ textAlign: 'center', textDecoration: 'none', padding: 10 }}>
                      บันทึกผล
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="detail-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> เพิ่มรอบลุกเดิน
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="datetime-local" className="form-input" style={{ marginBottom: 0 }} value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            <button className="btn btn-primary" style={{ width: 'auto', padding: '6px 16px' }} onClick={addRound}>เพิ่ม</button>
          </div>
        </div>

        {patient.incidents.some((i) => i.status === 'CLOSED') && (
          <div className="detail-card" style={{ padding: 16 }}>
            <h2 className="section-title" style={{ marginTop: 0 }}>เหตุการณ์ที่ปิดแล้ว</h2>
            {patient.incidents
              .filter((i) => i.status === 'CLOSED')
              .map((i) => (
                <div key={i.id} style={{ fontSize: 13, marginBottom: 8 }}>
                  <div>{i.detail}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    ปิดโดย {i.closedByName || '-'} ({fmtDateTime(i.closedAt)}){i.closeNote ? `: ${i.closeNote}` : ''}
                  </div>
                </div>
              ))}
          </div>
        )}

        {user?.role === 'HEAD_NURSE' && (
          <button className="btn btn-danger" style={{ marginTop: 8 }} onClick={deletePatient}>
            ลบผู้ป่วย (หัวหน้าเวร)
          </button>
        )}
      </div>
    </>
  );
}
