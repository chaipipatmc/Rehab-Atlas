# Lisa 🤖📅 — LINE Calendar Assistant

ผู้ช่วยส่วนตัวใน LINE สำหรับจัดการ Google Calendar ผ่านการแชท

## ความสามารถ

- อ่านข้อความที่พิมพ์/forward มา → สรุป action สำคัญ แล้วลงตารางให้
- ถามข้อมูลเพิ่มเติมเมื่อไม่ชัดเจน และ**เช็ค conflict** กับนัดเดิมก่อนลงเสมอ
- หัวข้อนัดขึ้นต้น `[LISA] - Topic` ทุกครั้ง
- Session ปกติ **30 นาที** (ยกเว้นสั่งระยะเวลาเอง)
- ประชุมออนไลน์ → สร้าง **Google Meet** ให้อัตโนมัติ
- **Invitation**: default ไม่ส่ง — ถ้าสั่งให้ส่ง Lisa จะค้นอีเมลจาก contacts แล้วขอให้พิมพ์ `ยืนยัน` / `confirm` / `cf` ก่อนส่งเสมอ (บังคับใน code, ไม่ใช่แค่ prompt)
- **สถานที่**: ถามและใส่ทุกครั้ง รองรับชื่อย่อ (TP office, fab office, aqua office — เพิ่ม/แก้ผ่านแชทได้: "จำไว้ TP office คือ …")
- **เตือนก่อนนัด 30 นาที** พร้อมลิงก์ประชุม (ทั้ง Meet ที่ Lisa สร้าง และลิงก์จาก invitation ที่คนอื่นส่งมา)
- **ทุกเช้า 8:00** ส่ง Flex card สรุปนัดหมายประจำวัน

## สถาปัตยกรรม

Standalone Next.js app (API เท่านั้น) ในโฟลเดอร์ `lisa/` — deploy เป็น Vercel project แยกจาก Rehab-Atlas แต่ใช้ Supabase project เดิมได้ (ตารางทั้งหมด prefix `lisa_`, service-role only)

| Route | หน้าที่ |
|---|---|
| `POST /api/line/webhook` | รับข้อความ LINE → Claude agent loop (list/create/update/delete events, contacts, locations, invitation gate) |
| `GET /api/cron/reminders` | ทุก 5 นาที — เตือนนัดที่จะถึงใน ≤31 นาที (กันส่งซ้ำด้วยตาราง `lisa_reminded_events`) |
| `GET /api/cron/daily-brief` | 01:00 UTC = 08:00 ไทย — Flex card สรุปวัน |
| `GET /api/google/auth` → `/callback` | OAuth ครั้งเดียว เก็บ refresh token ใน `lisa_settings` |
| `GET /` | หน้า checklist ตรวจ env vars |

## Setup

### 1. Supabase

รัน `migrations/001_lisa_schema.sql` ใน Supabase SQL Editor (ใช้ project เดิมของ Rehab-Atlas ได้)

### 2. LINE Official Account

1. สร้าง Messaging API channel ที่ [LINE Developers Console](https://developers.line.biz/console/)
2. จด **Channel secret** และออก **Channel access token (long-lived)**
3. เพิ่มบอทเป็นเพื่อน แล้วทักไป 1 ข้อความ — ถ้ายังไม่ได้ตั้ง `LINE_OWNER_USER_ID` Lisa จะตอบกลับพร้อม user ID ของคุณให้ copy
4. ตั้ง Webhook URL: `https://<your-lisa-domain>/api/line/webhook` และเปิด "Use webhook" (ปิด auto-reply)

### 3. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) → สร้าง project → เปิด **Google Calendar API**
2. OAuth consent screen → External → เพิ่มบัญชีตัวเองเป็น Test user (หรือ Internal ถ้าใช้ Workspace)
3. Credentials → Create OAuth client ID → **Web application** → Authorized redirect URI: `https://<your-lisa-domain>/api/google/callback`
4. หลัง deploy แล้ว เปิด `https://<your-lisa-domain>/api/google/auth?key=<CRON_SECRET>` → เลือกบัญชี Google → เสร็จ (refresh token ถูกเก็บใน DB, ทำครั้งเดียว)

### 4. Vercel

สร้าง Vercel project ใหม่จาก repo นี้ โดยตั้ง **Root Directory = `lisa`** แล้วใส่ env vars:

| Env | ค่า |
|---|---|
| `LINE_CHANNEL_SECRET` | จาก LINE console |
| `LINE_CHANNEL_ACCESS_TOKEN` | long-lived token จาก LINE console |
| `LINE_OWNER_USER_ID` | LINE user ID ของคุณ (ดูข้อ 2.3) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | จาก Google Cloud |
| `LISA_BASE_URL` | `https://<your-lisa-domain>` |
| `ANTHROPIC_API_KEY` | Claude API key |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | จาก Supabase project |
| `CRON_SECRET` | random string ยาวๆ (Vercel ใช้ยิง cron + ป้องกันหน้า OAuth) |
| `LISA_CLAUDE_MODEL` | (optional) default `claude-sonnet-5` |

Cron ตั้งไว้แล้วใน `vercel.json` (reminders ทุก 5 นาที, daily brief 01:00 UTC)

### 5. Contacts (จาก Obsidian vault)

Export รายชื่อ + อีเมลจาก vault แล้ว insert เข้า `lisa_contacts`:

```sql
insert into lisa_contacts (name, nickname, email) values
  ('ชื่อจริง', 'ชื่อเล่น', 'email@example.com');
```

หรือบอก Lisa ในแชทได้เลย: "Lisa จำอีเมลคุณเอไว้ a@example.com"

## Dev

```bash
cd lisa
npm install
npm run dev        # ต้องมี .env.local
npm run typecheck
npm run build
```
