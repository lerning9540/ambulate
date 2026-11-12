import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { notificationAPI } from '../services/api';
import Header from '../components/Header';
import { Bell, AlertTriangle, ClipboardCheck, Activity, CheckCircle2 } from 'lucide-react';

export default function Notifications({ showToast }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await notificationAPI.getAll();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      showToast('อ่านการแจ้งเตือนทั้งหมดแล้ว');
    } catch (err) {
      showToast('เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleClickNotification = async (notif) => {
    try {
      if (!notif.isRead) {
        await notificationAPI.markRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => n.id === notif.id ? { ...n, isRead: true } : n)
        );
      }
      if (notif.patientId) {
        navigate(`/patient/${notif.patientId}`);
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: th });
    } catch {
      return dateStr;
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'DUE': return <Bell color="var(--primary-blue)" size={20} />;
      case 'LATE': return <AlertTriangle color="var(--status-red)" size={20} />;
      case 'INCIDENT': return <AlertTriangle color="#6f42c1" size={20} />;
      default: return <Activity color="var(--text-muted)" size={20} />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <Header title="การแจ้งเตือน" showBack={true} />
      
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            ทั้งหมด {unreadCount > 0 && <span style={{ color: 'var(--status-red)' }}>({unreadCount} ใหม่)</span>}
          </h2>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              อ่านทั้งหมด
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>กำลังโหลดการแจ้งเตือน...</div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <Bell size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <div>ไม่มีการแจ้งเตือนใหม่</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="detail-card"
                style={{ 
                  padding: 16, 
                  margin: 0, 
                  cursor: 'pointer',
                  borderLeft: !notif.isRead ? '4px solid var(--primary-blue)' : '1px solid var(--border-color)',
                  background: !notif.isRead ? '#f8fbff' : 'white'
                }}
                onClick={() => handleClickNotification(notif)}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ marginTop: 2 }}>{getNotifIcon(notif.type)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--text-main)', marginBottom: 4 }}>
                      {notif.message}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {formatTime(notif.createdAt || notif.sentAt)}
                    </div>
                  </div>
                  {!notif.isRead && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-blue)', marginTop: 6 }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
