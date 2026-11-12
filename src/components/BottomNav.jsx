import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, FileText, Settings } from 'lucide-react';

export default function BottomNav() {
  return (
    <div className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Home size={24} />
        <span>Dashboard</span>
      </NavLink>
      
      <NavLink to="/patients" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <User size={24} />
        <span>ผู้ป่วย</span>
      </NavLink>
      
      <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <FileText size={24} />
        <span>รายงาน</span>
      </NavLink>
      
      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Settings size={24} />
        <span>ตั้งค่า</span>
      </NavLink>
    </div>
  );
}
