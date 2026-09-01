# ชุดติดตั้ง Backend ขนาดเล็ก

โฟลเดอร์นี้มีไว้เตรียม `package.json` และ `package-lock.json` สำหรับ Hosting เท่านั้น โดยจะติดตั้งเฉพาะแพ็กเกจที่ `server.js` ใช้จริง ได้แก่ `cors`, `dotenv`, `express`, `multer` และ `mysql2`

## ไฟล์ที่ต้องอัปโหลดไป `/app`

1. `backend-deploy/package.json` ให้วางเป็น `/app/package.json`
2. `backend-deploy/package-lock.json` ให้วางเป็น `/app/package-lock.json`
3. `server.js` เวอร์ชันล่าสุด ให้วางเป็น `/app/server.js`
4. `.env` ของ Server ให้อยู่ที่ `/app/.env` เหมือนเดิม ไม่ควรนำไฟล์นี้ไปเผยแพร่ที่อื่น

ไม่ต้องอัปโหลด `node_modules` จากคอมพิวเตอร์ และไม่ต้องอัปโหลดโฟลเดอร์ Expo เช่น `app`, `components`, `assets` หรือ `dist` เข้า `/app` เพื่อรัน Backend

สำหรับระบบอัปโหลดรูป ให้ตรวจว่า `/app/.env` มีสองบรรทัดนี้ และมีโฟลเดอร์ `/app/uploads` ที่เขียนไฟล์ได้:

```env
PUBLIC_BASE_URL=http://119.59.102.161:3045
UPLOAD_DIR=/app/uploads
```

## ติดตั้งบน Hosting ผ่าน PuTTY

```bash
cd /app
npm ci --omit=dev
```

คำสั่งนี้จะสร้าง `/app/node_modules` ชุดเล็กบน Hosting เอง เป็นเรื่องปกติที่ FileZilla จะมองเห็นโฟลเดอร์นี้

ตรวจสอบก่อนเปิด Server:

```bash
node -p "require.resolve('dotenv')"
node -p "require.resolve('cors')"
node -p "require.resolve('express')"
node -p "require.resolve('mysql2/promise')"
```

เปิด Backend:

```bash
node server.js
```

ตรวจขนาดจริงบน Hosting:

```bash
du -sh /app/node_modules
```
