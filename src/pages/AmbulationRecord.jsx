import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ambulationAPI, taskAPI } from '../services/api';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { fmtDateTime, toLocalInput } from '../lib/status';

const ASSIST_LEVELS = ['เดินได้ด้วยตนเอง', 'ต้องมีผู้ช่วยพยุง', 'ต้องใช้เครื่องช่วยเดิน', 'ต้องมีเจ้าหน้าที่ช่วยเหลือ'];
const SYMPTOMS = ['เวียนศีรษะ', 'เหนื่อย', 'ปวดแผล', 'หน้ามืด', 'ใจสั่น'];

function SymptomPicker({ value, onChange }) {
  const toggle = (s) => {
    if (s === 'none') return onChange({ none: true, list: [], other: '' });
    const list = value.list.includes(s) ? value.list.filter((x) => x !== s) : [...value.list, s];
    onChange({ ...value, none: false, list });
  };
  return (
    <div className="checkbox-list">
      <label className="checkbox-item">
        <input type="checkbox" checked={value.none} onChange={() => toggle('none')} />
        <span>ไม่มีอาการผิดปกติ</span>
      </label>
      {SYMPTOMS.map((s) => (
        <label className="checkbox-item" key={s}>
          <input type="checkbox" checked={value.list.includes(s)} onChange={() => toggle(s)} />
          <span>{s}</span>
        </label>
      ))}
      <input
        type="text"
        className="form-input"
        placeholder="อาการอื่น ๆ (ถ้ามี)"
        value={value.other}
        onChange={(e) => onChange({ ...value, none: false, other: e.target.value })}
        style={{ marginBottom: 0 }}
      />
    </div>
  );
}

const symptomText = (v) => (v.none ? 'ไม่มีอาการผิดปกติ' : [...v.list, v.other.trim()].filter(Boolean).join(', '));

export default function AmbulationRecord({ showToast }) {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);

  const now = toLocalInput(new Date());
  const [form, setForm] = useState({
    startTime: now,
    endTime: now,
    distance: '',
    duration: '',
    assistLevel: '',
    tolerance: 'ดี',
    stoppedEarly: false,
    complication: '',
    note: '',
  });
  const [during, setDuring] = useState({ none: true, list: [], other: '' });
  const [after, setAfter] = useState({ none: true, list: [], other: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    taskAPI.getById(taskId).then(setTask).catch((err) => showToast(err.message, 'error'));
  }, [taskId, showToast]);

  if (!task) return <div className="app-container flex-center">กำลังโหลด...</div>;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.assistLevel) return showToast('กรุณาเลือกระดับการช่วยเหลือ', 'error');
    if (!form.distance && !form.duration && !form.stoppedEarly) return showToast('กรุณาระบุระยะทางหรือระยะเวลาที่เดิน', 'error');
    setLoading(true);
    try {
      await ambulationAPI.create({
        taskId,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        distance: form.distance === '' ? null : form.distance,
        duration: form.duration === '' ? null : form.duration,
        assistLevel: form.assistLevel,
        tolerance: form.tolerance,
        symptomsDuring: symptomText(during),
        symptomsAfter: symptomText(after),
        complication: form.complication,
        stoppedEarly: form.stoppedEarly,
        note: form.note,
      });
      showToast(form.complication ? 'บันทึกแล้ว และสร้างรายการติดตามเหตุการณ์ผิดปกติ' : 'บันทึกผลการเดินเรียบร้อยแล้ว', form.complication ? 'warning' : 'success');
      navigate(`/patient/${task.patientId}`, { replace: true });
    } catch (error) {
      showToast(error.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setLoading(false);
    }
  };

  const Label = ({ children }) => <div className="info-label" style={{ marginBottom: 8 }}>{children}</div>;

  return (
    <>
      <Header title="บันทึกผลการ Ambulate" showBack={true} />

      <div className="page-content">
        <form onSubmit={handleSubmit}>
          <div className="detail-card" style={{ padding: 12, fontSize: 13 }}>
            <div style={{ fontWeight: 600 }}>
              {task.patient.name} · AN {task.patient.an}
            </div>
            <div style={{ color: 'var(--text-muted)' }}>
              รอบที่ {task.roundNo} · กำหนด {fmtDateTime(task.scheduledAt)} น. · ผู้บันทึก {user?.name}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <Label>เวลาเริ่มจริง</Label>
              <input type="datetime-local" className="form-input" style={{ marginBottom: 0 }} value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <Label>เวลาสิ้นสุด</Label>
              <input type="datetime-local" className="form-input" style={{ marginBottom: 0 }} value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -10, marginBottom: 16 }}>
            ตรงเวลา/ล่าช้า คิดจากเวลาเริ่มจริง ไม่ใช่เวลาที่กดบันทึก
          </div>

          <div style={{ marginBottom: 16 }}>
            <Label>ระดับการช่วยเหลือ</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ASSIST_LEVELS.map((level) => (
                <button key={level} type="button" className={`segment-btn ${form.assistLevel === level ? 'active' : ''}`} style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 8 }} onClick={() => set('assistLevel', level)}>
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Label>ระยะทาง / ระยะเวลาที่เดิน (กรอกอย่างน้อย 1 ช่อง)</Label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span>เดินได้</span>
              <input type="number" inputMode="decimal" className="form-input" style={{ width: 70, margin: 0, padding: '4px 8px', textAlign: 'center' }} value={form.distance} onChange={(e) => set('distance', e.target.value)} />
              <span>เมตร</span>
              <input type="number" inputMode="numeric" className="form-input" style={{ width: 60, margin: 0, padding: '4px 8px', textAlign: 'center' }} value={form.duration} onChange={(e) => set('duration', e.target.value)} />
              <span>นาที</span>
            </div>
          </div>

          <label className="checkbox-item" style={{ marginBottom: 16 }}>
            <input type="checkbox" checked={form.stoppedEarly} onChange={(e) => set('stoppedEarly', e.target.checked)} />
            <span>ต้องหยุดก่อนกำหนด</span>
          </label>

          <div style={{ marginBottom: 16 }}>
            <Label>การทนต่อกิจกรรม</Label>
            <div className="segmented-control">
              {['ดี', 'ปานกลาง', 'ไม่ดี'].map((level) => (
                <button key={level} type="button" className={`segment-btn ${form.tolerance === level ? 'active' : ''}`} onClick={() => set('tolerance', level)}>
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Label>อาการระหว่างการลุกเดิน</Label>
            <SymptomPicker value={during} onChange={setDuring} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <Label>อาการหลังสิ้นสุดการลุกเดิน</Label>
            <SymptomPicker value={after} onChange={setAfter} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <Label>ภาวะแทรกซ้อน / เหตุการณ์ผิดปกติ (ถ้ามี)</Label>
            <textarea className="form-input" rows={2} style={{ marginBottom: 0, resize: 'none' }} placeholder="เช่น ล้ม สายระบายเลื่อนหลุด — ถ้ากรอก ระบบจะแจ้งเตือนให้ติดตาม" value={form.complication} onChange={(e) => set('complication', e.target.value)} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <Label>หมายเหตุ</Label>
            <input type="text" className="form-input" style={{ marginBottom: 0 }} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="-" />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </form>
      </div>
    </>
  );
}
