import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentAPI, checklistAPI, taskAPI } from '../services/api';
import Header from '../components/Header';
import { CheckCircle2, XCircle, Circle } from 'lucide-react';
import { evaluateItem, evaluateChecklist, criteriaText } from '../../shared/checklist.js';
import { StatusPill, fmtDateTime } from '../lib/status';

// Checklist ก่อนลุกเดิน: เกณฑ์มาจากฐานข้อมูล (หัวหน้าเวรแก้ได้)
// กรอกค่าแล้วขึ้นเขียว (ผ่าน) / แดง (ไม่ผ่าน) ทันที ระบบสรุปผล READY / NOT READY เอง
export default function PreAmbulationAssessment({ showToast }) {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [items, setItems] = useState([]);
  const [values, setValues] = useState({});
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([taskAPI.getById(taskId), checklistAPI.getAll()])
      .then(([t, list]) => {
        setTask(t);
        setItems(list);
      })
      .catch((err) => showToast(err.message, 'error'));
  }, [taskId, showToast]);

  if (!task) return <div className="app-container flex-center">กำลังโหลด...</div>;

  const isCopd = task.patient.isCopd;
  const evaluation = evaluateChecklist(items, values, isCopd);
  const set = (code, v) => setValues((prev) => ({ ...prev, [code]: v }));

  const groups = [];
  for (const item of items) {
    let g = groups.find((x) => x.groupNo === item.groupNo);
    if (!g) groups.push((g = { groupNo: item.groupNo, label: item.groupLabel, items: [] }));
    g.items.push(item);
  }

  const handleSave = async () => {
    if (!evaluation.complete) {
      showToast(`กรุณากรอกให้ครบ: ${evaluation.missing.join(', ')}`, 'error');
      return;
    }
    setLoading(true);
    try {
      const a = await assessmentAPI.create({ taskId, values });
      setSaved(a);
      window.scrollTo(0, 0);
    } catch (error) {
      showToast(error.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setLoading(false);
    }
  };

  const Mark = ({ passed }) =>
    passed === null ? <Circle size={20} color="var(--border-color)" /> : passed ? <CheckCircle2 size={20} color="var(--status-green)" /> : <XCircle size={20} color="var(--status-red)" />;

  const tint = (passed) => (passed === null ? {} : passed ? { borderColor: 'var(--status-green)', background: '#f3fbf5' } : { borderColor: 'var(--status-red)', background: '#fdf3f4' });

  // หลังบันทึก: แสดงผลสรุป
  if (saved) {
    const ready = saved.result === 'READY';
    return (
      <>
        <Header title="ผลการประเมิน" showBack={true} />
        <div className="page-content">
          <div className="detail-card" style={{ padding: 20, textAlign: 'center', background: ready ? '#d4edda' : '#f8d7da' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: ready ? '#155724' : '#a71d2a' }}>{ready ? 'READY TO AMBULATE' : 'NOT READY TO AMBULATE'}</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {task.patient.name} (AN {task.patient.an}) · รอบที่ {task.roundNo}
              <br />
              ประเมิน {fmtDateTime(saved.assessedAt)} โดย {saved.assessedByName}
            </div>
          </div>
          {!ready && (
            <div className="detail-card" style={{ padding: 16 }}>
              <h2 className="section-title" style={{ marginTop: 0 }}>ข้อที่ไม่ผ่าน</h2>
              {saved.failedReasons.map((f) => (
                <div key={f.code} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, color: 'var(--status-red)' }}>{f.label}</div>
                  <div style={{ fontSize: 13 }}>{f.reason}</div>
                  {f.advice && <div style={{ fontSize: 13, color: 'var(--primary-blue)' }}>คำแนะนำ: {f.advice}</div>}
                </div>
              ))}
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                ยังไม่นับว่าได้ลุกเดิน และถ้าเกิน 1 ชม. หลังเวลาที่กำหนดยังไม่ได้บันทึกผล จะนับเป็นล่าช้า (Late)
              </div>
            </div>
          )}
          {ready ? (
            <button className="btn btn-success" onClick={() => navigate(`/task/${taskId}/ambulation`, { replace: true })}>ไปบันทึกผลการลุกเดิน</button>
          ) : (
            <button className="btn btn-primary" onClick={() => navigate(`/patient/${task.patientId}`, { replace: true })}>กลับหน้าผู้ป่วย</button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Checklist ก่อน Ambulate" showBack={true} />

      <div className="page-content">
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          {task.patient.name} (AN {task.patient.an}) · รอบที่ {task.roundNo} · กำหนด {fmtDateTime(task.scheduledAt)} น.
          {isCopd && <span style={{ color: 'var(--primary-blue)', fontWeight: 600 }}> · ผู้ป่วย COPD</span>}
        </div>

        {groups.map((g) => (
          <div className="checklist-item" key={g.groupNo}>
            <div className="checklist-header" style={{ marginBottom: g.items.length > 1 || g.items[0].kind !== 'BOOL' ? 8 : 0 }}>
              <span>
                {g.groupNo}. {g.label}
              </span>
            </div>
            {g.items.map((item) => {
              const { value, passed } = evaluateItem(item, values, isCopd);
              if (item.kind === 'BOOL') {
                const v = values[item.code];
                return (
                  <div key={item.id} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)', marginTop: 6, ...tint(passed) }}>
                    {(g.items.length > 1 || item.label !== g.label) && <div style={{ fontSize: 13, marginBottom: 6 }}>{item.label}</div>}
                    {item.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{item.description}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="segmented-control" style={{ marginBottom: 0, flex: 1 }}>
                        <button type="button" className={`segment-btn ${v === true ? 'active' : ''}`} onClick={() => set(item.code, true)}>ผ่าน</button>
                        <button type="button" className={`segment-btn ${v === false ? 'active' : ''}`} onClick={() => set(item.code, false)}>ไม่ผ่าน</button>
                      </div>
                      <Mark passed={passed} />
                    </div>
                  </div>
                );
              }
              return (
                <div key={item.id} className="vital-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, border: '1px solid transparent', marginTop: 4, ...tint(passed) }}>
                  <div style={{ width: 110, fontSize: 13 }}>
                    {item.label}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{criteriaText(item, isCopd)}</div>
                  </div>
                  {item.kind === 'MAP' ? (
                    <div style={{ flex: 1, fontWeight: 600 }}>{value ?? '-'}</div>
                  ) : (
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      className="form-input"
                      style={{ margin: 0, padding: '6px 8px', flex: 1 }}
                      value={values[item.code] ?? ''}
                      onChange={(e) => set(item.code, e.target.value)}
                    />
                  )}
                  <span style={{ fontSize: 12, width: 56, color: 'var(--text-muted)' }}>{item.unit}</span>
                  <Mark passed={passed} />
                </div>
              );
            })}
          </div>
        ))}

        <div className="detail-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13 }}>ผลประเมิน (อัตโนมัติ)</span>
          {evaluation.complete ? <StatusPill status={evaluation.result} /> : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>ยังกรอกไม่ครบ {evaluation.missing.length} ข้อ</span>}
        </div>

        <div className="action-buttons" style={{ position: 'static' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึกผลการประเมิน'}
          </button>
        </div>
      </div>
    </>
  );
}
