import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Bell, Shield, HelpCircle, ClipboardList, History } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifPerm, setNotifPerm] = React.useState('Notification' in window ? Notification.permission : 'unsupported');

  const handleLogout = () => {
    if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <>
      <Header title="ตั้งค่า" />
      
      <div className="page-content">
        <div className="detail-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="profile-avatar" style={{ width: 64, height: 64 }}>
            <User size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, color: 'var(--primary-blue)', marginBottom: 4 }}>{user?.name || 'พยาบาลวิชาชีพ'}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>ID: {user?.username || 'NURSE-01'} · {user?.role === 'HEAD_NURSE' ? 'หัวหน้าเวร' : 'พยาบาล'}</p>
          </div>
        </div>

        <h3 className="section-title">ตั้งค่าทั่วไป</h3>
        
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Bell size={20} color="var(--primary-blue)" />
              <div>
                <span style={{ fontSize: 14, fontWeight: 500 }}>แจ้งเตือนบนเบราว์เซอร์</span>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {notifPerm === 'denied' ? 'ถูกปิดไว้ในการตั้งค่าเบราว์เซอร์' : notifPerm === 'unsupported' ? 'เบราว์เซอร์นี้ไม่รองรับ' : 'แจ้งเตือนขณะเปิดเว็บไว้'}
                </div>
              </div>
            </div>
            {/* Simple toggle switch pure CSS */}
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notifPerm === 'granted'}
                disabled={notifPerm === 'unsupported' || notifPerm === 'denied'}
                onChange={async () => {
                  if (notifPerm !== 'granted' && 'Notification' in window) setNotifPerm(await Notification.requestPermission());
                }}
                style={{ width: 18, height: 18, accentColor: 'var(--primary-blue)' }}
              />
            </label>
          </div>
          
          <Link to="/privacy" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--border-color)', color: 'inherit', textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Shield size={20} color="var(--primary-blue)" />
              <span style={{ fontSize: 14, fontWeight: 500 }}>ความเป็นส่วนตัว</span>
            </div>
            <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
          </Link>

          <Link to="/help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', color: 'inherit', textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <HelpCircle size={20} color="var(--primary-blue)" />
              <span style={{ fontSize: 14, fontWeight: 500 }}>ช่วยเหลือและสนับสนุน</span>
            </div>
            <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
          </Link>
        </div>

        {user?.role === 'HEAD_NURSE' && (
          <>
            <h3 className="section-title">สำหรับหัวหน้าเวร</h3>
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden', marginBottom: 24 }}>
              <Link to="/checklist-admin" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderBottom: '1px solid var(--border-color)', color: 'inherit', textDecoration: 'none' }}>
                <ClipboardList size={20} color="var(--primary-blue)" />
                <span style={{ fontSize: 14, fontWeight: 500 }}>แก้เกณฑ์ Checklist</span>
              </Link>
              <Link to="/audit" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, color: 'inherit', textDecoration: 'none' }}>
                <History size={20} color="var(--primary-blue)" />
                <span style={{ fontSize: 14, fontWeight: 500 }}>ประวัติการแก้ไขข้อมูล</span>
              </Link>
            </div>
          </>
        )}

        <button 
          onClick={handleLogout}
          className="btn btn-danger" 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32 }}
        >
          <LogOut size={20} />
          ออกจากระบบ
        </button>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          SARA Version 1.0.0
        </div>
      </div>
    </>
  );
}
