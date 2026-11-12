import React, { useState, useEffect, useCallback } from 'react';
import { checklistAPI } from '../services/api';
import Header from '../components/Header';
import { criteriaText } from '../../shared/checklist.js';

const KINDS = { NUMBER: 'ตัวเลข', BOOL: 'ผ่าน/ไม่ผ่าน', MAP: 'MAP (คำนวณจาก SBP/DBP)' };
const EMPTY = { groupNo: '', groupLabel: '', label: '', kind: 'BOOL', unit: '', minValue: '', minInclusive: false, maxValue: '', maxInclusive: false, copdMinValue: '', description: '', advice: '', sortOrder: 0, active: true };

// หน้าแก้เกณฑ์ Checklist สำหรับหัวหน้าเวร (ไม่ต้องแก้โค้ด)
export default function ChecklistAdmin({ showToast }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    checklistAPI.getAll(true).then(setItems).catch((e) => showToast(e.message, 'error'));
  }, [showToast]);
  useEffect(load, [load]);

  const save = async () => {
    try {
      if (editing.id) await checklistAPI.update(editing.id, editing);
      else await checklistAPI.create(editing);
      showToast('บันทึกเกณฑ์แล้ว');
      setEditing(null);
      load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const field = (k, label, type = 'text') => (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 2 }}>{label}</label>
      <input
        type={type}
        step="any"
        className="form-input"
        style={{ marginBottom: 0 }}
        value={editing[k] ?? ''}
        onChange={(e) => setEditing((x) => ({ ...x, [k]: e.target.value }))}
      />
    </div>
  );
  const check = (k, label) => (
    <label style={{ display: 'flex', gap: 6, fontSize: 13, alignItems: 'center', marginBottom: 8 }}>
      <input type="checkbox" checked={!!editing[k]} onChange={(e) => setEditing((x) => ({ ...x, [k]: e.target.checked }))} />
      {label}
    </label>
  );

  if (editing) {
    return (
      <>
        <Header title={editing.id ? 'แก้เกณฑ์' : 'เพิ่มเกณฑ์'} showBack={false} />
        <div className="page-content">
          <div className="detail-card" style={{ padding: 16 }}>
            {field('groupNo', 'ข้อที่', 'number')}
            {field('groupLabel', 'ชื่อข้อ')}
            {field('label', 'ชื่อรายการ')}
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 2 }}>ชนิด</label>
              <select className="form-input" style={{ marginBottom: 0 }} value={editing.kind} onChange={(e) => setEditing((x) => ({ ...x, kind: e.target.value }))}>
                {Object.entries(KINDS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {editing.kind !== 'BOOL' && (
              <>
                {field('unit', 'หน่วย')}
                {field('minValue', 'ค่าต่ำสุด (เว้นว่าง = ไม่มี)', 'number')}
                {check('minInclusive', 'รวมค่าต่ำสุด (≥) ถ้าไม่ติ๊ก = มากกว่า (>)')}
                {field('maxValue', 'ค่าสูงสุด (เว้นว่าง = ไม่มี)', 'number')}
                {check('maxInclusive', 'รวมค่าสูงสุด (≤) ถ้าไม่ติ๊ก = น้อยกว่า (<)')}
                {field('copdMinValue', 'ค่าต่ำสุดสำหรับผู้ป่วย COPD (ถ้ามี)', 'number')}
              </>
            )}
            {field('description', 'คำอธิบาย')}
            {field('advice', 'คำแนะนำเมื่อไม่ผ่าน')}
            {field('sortOrder', 'ลำดับในข้อ', 'number')}
            {check('active', 'ใช้งาน')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={save}>บันทึก</button>
            <button className="btn" onClick={() => setEditing(null)}>ยกเลิก</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="เกณฑ์ Checklist" showBack={true} />
      <div className="page-content">
        <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setEditing({ ...EMPTY })}>+ เพิ่มเกณฑ์</button>
        {items.map((it) => (
          <div key={it.id} className="detail-card" style={{ padding: 12, cursor: 'pointer', opacity: it.active ? 1 : 0.5 }} onClick={() => setEditing({ ...it })}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              ข้อ {it.groupNo}. {it.groupLabel} {!it.active && '(ปิดใช้งาน)'}
            </div>
            <div style={{ fontWeight: 600 }}>{it.label}</div>
            <div style={{ fontSize: 13 }}>
              เกณฑ์: {criteriaText(it)}
              {it.copdMinValue != null && ` · COPD ≥ ${it.copdMinValue}`}
            </div>
            {it.advice && <div style={{ fontSize: 12, color: 'var(--primary-blue)' }}>คำแนะนำ: {it.advice}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
