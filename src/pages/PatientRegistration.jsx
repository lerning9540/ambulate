import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientAPI } from '../services/api';
import { toLocalInput } from '../lib/status';
import Header from '../components/Header';
import { User, Activity, Clock, FileText } from 'lucide-react';

export default function PatientRegistration({ showToast }) {
  const navigate = useNavigate();
  const { id } = useParams(); // มี id = โหมดแก้ไข
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    an: '',
    name: '',
    age: '',
    gender: 'M',
    bed: '',
    surgeryType: '',
    orDischargeTime: '',
    firstScheduledTime: '',
    linesDevices: '',
    doctorRestriction: '',
    note: '',
    isCopd: false,
  });

  useEffect(() => {
    if (!isEdit) return;
    patientAPI.getById(id).then((p) =>
      setForm({
        an: p.an,
        name: p.name,
        age: String(p.age),
        gender: p.gender,
        bed: p.bed || '',
        surgeryType: p.surgeryType,
        orDischargeTime: toLocalInput(p.orDischargeAt),
        firstScheduledTime: '',
        linesDevices: p.linesDevices || '',
        doctorRestriction: p.doctorRestriction || '',
        note: p.note || '',
        isCopd: p.isCopd,
      })
    ).catch((err) => showToast(err.message, 'error'));
  }, [id, isEdit, showToast]);

  const surgeryTypes = [
    'Appendectomy: ผ่าตัดไส้ติ่งอักเสบ',
    'Cholecystectomy: ผ่าตัดถุงน้ำดี',
    'Exploratory Laparotomy: ผ่าตัดเปิดสำรวจช่องท้อง',
    'Colectomy: ผ่าตัดลำไส้ใหญ่บางส่วน',
    'Gastrectomy: ผ่าตัดกระเพาะอาหาร',
    'Hernioplasty: ผ่าตัดซ่อมแซมไส้เลื่อน',
    'อื่นๆ'
  ];
  // รายการเก่าที่บันทึกไว้ก่อนเปลี่ยนตัวเลือก ให้ยังแสดงค่าเดิมได้เมื่อแก้ไข
  const surgeryOptions = form.surgeryType && !surgeryTypes.includes(form.surgeryType)
    ? [...surgeryTypes, form.surgeryType]
    : surgeryTypes;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{8}$/.test(form.an)) {
      showToast('AN ต้องเป็นตัวเลข 8 หลัก', 'error');
      return;
    }
    if (!form.an || !form.name || !form.age || !form.surgeryType || !form.orDischargeTime || (!isEdit && !form.firstScheduledTime)) {
      showToast('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        an: form.an,
        name: form.name,
        age: parseInt(form.age),
        gender: form.gender,
        bed: form.bed,
        surgeryType: form.surgeryType,
        orDischargeAt: new Date(form.orDischargeTime).toISOString(),
        linesDevices: form.linesDevices,
        doctorRestriction: form.doctorRestriction,
        note: form.note,
        isCopd: form.isCopd,
      };

      if (isEdit) {
        await patientAPI.update(id, payload);
        showToast('บันทึกการแก้ไขแล้ว', 'success');
        navigate(`/patient/${id}`);
      } else {
        const p = await patientAPI.create({ ...payload, firstScheduledAt: new Date(form.firstScheduledTime).toISOString() });
        showToast('ลงทะเบียนผู้ป่วยใหม่สำเร็จ', 'success');
        navigate(`/patient/${p.id}`);
      }
    } catch (err) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title={isEdit ? 'แก้ไขข้อมูลผู้ป่วย' : 'ลงทะเบียนผู้ป่วยใหม่'} showBack={true} />
      
      <div className="page-content">
        <form onSubmit={handleSubmit}>
          
          <div className="detail-card" style={{ padding: '20px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--primary-blue)', fontWeight: 'bold' }}>
              <User size={18} />
              <span>ข้อมูลผู้ป่วย</span>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>เลข AN (8 หลัก)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="เช่น 66012345"
                maxLength={8}
                value={form.an}
                onChange={(e) => setForm({...form, an: e.target.value.replace(/\D/g, '')})}
                style={{ marginBottom: 0 }}
              />
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>ชื่อ-นามสกุล</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="ชื่อ นามสกุล"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                style={{ marginBottom: 0 }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>อายุ (ปี)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={form.age}
                  onChange={(e) => setForm({...form, age: e.target.value})}
                  style={{ marginBottom: 0 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>เพศ</label>
                <div className="segmented-control" style={{ marginBottom: 0 }}>
                  <button type="button" className={`segment-btn ${form.gender === 'M' ? 'active' : ''}`} onClick={() => setForm({...form, gender: 'M'})}>ชาย</button>
                  <button type="button" className={`segment-btn ${form.gender === 'F' ? 'active' : ''}`} onClick={() => setForm({...form, gender: 'F'})}>หญิง</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>เตียง (ถ้ามี)</label>
                <input type="text" className="form-input" value={form.bed} onChange={(e) => setForm({...form, bed: e.target.value})} style={{ marginBottom: 0 }} />
              </div>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, paddingBottom: 10 }}>
                <input type="checkbox" checked={form.isCopd} onChange={(e) => setForm({...form, isCopd: e.target.checked})} />
                ผู้ป่วย COPD
              </label>
            </div>
          </div>

          <div className="detail-card" style={{ padding: '20px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--primary-blue)', fontWeight: 'bold' }}>
              <Activity size={18} />
              <span>ข้อมูลการผ่าตัด</span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>ชนิดการผ่าตัด</label>
              <select 
                className="form-input" 
                value={form.surgeryType}
                onChange={(e) => setForm({...form, surgeryType: e.target.value})}
                style={{ marginBottom: 0 }}
              >
                <option value="">-- เลือกชนิด --</option>
                {surgeryOptions.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>วันและเวลาออกจากห้องผ่าตัด (OR Out)</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                value={form.orDischargeTime}
                onChange={(e) => setForm({...form, orDischargeTime: e.target.value})}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          {!isEdit && (
          <div className="detail-card" style={{ padding: '20px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--primary-blue)', fontWeight: 'bold' }}>
              <Clock size={18} />
              <span>วันเวลาเริ่มกระตุ้นลุกเดิน (รอบที่ 1)</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>เพิ่มรอบถัดไปหรือแก้เวลาได้ในหน้ารายละเอียดผู้ป่วย</div>
            <input
              type="datetime-local"
              className="form-input"
              value={form.firstScheduledTime}
              onChange={(e) => setForm({...form, firstScheduledTime: e.target.value})}
              style={{ marginBottom: 0 }}
            />
          </div>
          )}

          <div className="detail-card" style={{ padding: '20px 16px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--primary-blue)', fontWeight: 'bold' }}>
              <FileText size={18} />
              <span>สาย/อุปกรณ์ ข้อจำกัด และหมายเหตุ</span>
            </div>

            {[
              ['linesDevices', 'สายและอุปกรณ์ที่ติดอยู่กับผู้ป่วย', 'เช่น สายระบาย สายสวนปัสสาวะ'],
              ['doctorRestriction', 'ข้อจำกัดในการลุกเดินตามคำสั่งแพทย์', 'ถ้าไม่มีเว้นว่าง'],
              ['note', 'หมายเหตุเพิ่มเติม', ''],
            ].map(([key, label, ph]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{label}</label>
                <textarea
                  className="form-input"
                  placeholder={ph}
                  value={form[key]}
                  onChange={(e) => setForm({...form, [key]: e.target.value})}
                  rows={2}
                  style={{ marginBottom: 0, resize: 'none' }}
                />
              </div>
            ))}
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: 16, fontSize: 16 }} disabled={loading}>
            {loading ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลผู้ป่วยใหม่'}
          </button>
          
        </form>
      </div>
    </>
  );
}
