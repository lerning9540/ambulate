# วิธี deploy (Supabase + Render + Vercel)

## 1. Supabase (ฐานข้อมูล)
1. สร้างโปรเจกต์ใหม่ที่ supabase.com
2. กด **Connect** → เลือก **Session pooler** (port 5432) → คัดลอก URL แล้วใส่รหัสผ่านฐานข้อมูลแทน `[YOUR-PASSWORD]`

## 2. Render (backend)
1. New → **Blueprint** → เลือก repo นี้ (ใช้ `render.yaml`)
2. ใส่ `DATABASE_URL` = URL จากข้อ 1 (`JWT_SECRET` ระบบสร้างให้เอง)
3. ตอน build ระบบจะสร้างตาราง (`prisma db push`) และใส่เกณฑ์ checklist เริ่มต้น (`npm run db:seed`) ให้อัตโนมัติ
4. จด URL ของ service เช่น `https://sara-backend-xxxx.onrender.com`

## 3. Vercel (frontend)
1. Add New → Project → เลือก repo นี้ (Framework: Vite)
2. Environment Variable: `VITE_API_URL` = `https://<render-service>/api`
3. Deploy

## 4. ตั้งหัวหน้าเวรคนแรก
สมัครผู้ใช้ผ่านหน้าเว็บก่อน แล้วที่ Render → Shell รัน
```
npm run make-head -- <username>
```

## หมายเหตุ
- Render แบบฟรีจะหลับเมื่อไม่มีคนใช้ เปิดครั้งแรกอาจรอ ~1 นาที
- แจ้งเตือนจะเด้งเฉพาะตอนเปิดเว็บอยู่ (ถ้าปิดเว็บ แจ้งเตือนจะไปรออยู่ในหน้าแจ้งเตือน)
