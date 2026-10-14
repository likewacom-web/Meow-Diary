# เหมียวไดอารี่ บน Play Store

แอป Android นี้เป็น Trusted Web Activity (TWA): เปิดเว็บ
https://likewacom-web.github.io/Meow-Diary/ แบบเต็มจอผ่าน Chrome
แก้เว็บ (`index.html`) แล้วแอปจะอัปเดตตามทันที ไม่ต้องส่งแอปใหม่

## 1. ใส่กุญแจเซ็นแอปใน GitHub (ครั้งเดียว)

Settings → Secrets and variables → Actions → New repository secret

| ชื่อ | ค่า |
|---|---|
| `KEYSTORE_BASE64` | เนื้อหาไฟล์ `KEYSTORE_BASE64.txt` |
| `KEYSTORE_PASSWORD` | เนื้อหาไฟล์ `password.txt` |

เก็บ `upload.jks` และรหัสผ่านไว้ให้ดี ห้ามอัปโหลดลง repo

## 2. สร้างไฟล์ .aab

Actions → "Android app (Play Store)" → Run workflow
เสร็จแล้วดาวน์โหลด artifact `meow-diary-android-N` จะได้ไฟล์ `.aab`
(สำหรับส่ง Play Store) และ `.apk` (ลองติดตั้งในมือถือได้เลย)

## 3. ให้แอปเต็มจอ (ไม่มีแถบ URL ด้านบน)

Android ต้องตรวจว่าเว็บเป็นของแอปนี้จริง โดยอ่านไฟล์
`https://likewacom-web.github.io/.well-known/assetlinks.json`

1. สร้าง repo ชื่อ `likewacom-web.github.io` (public) แล้วเปิด GitHub Pages
2. ใส่ไฟล์ `.well-known/assetlinks.json` (คัดลอกจาก `android/assetlinks.json`)
   และไฟล์ `.nojekyll` (ว่างเปล่า) เพื่อให้โฟลเดอร์ที่ขึ้นต้นด้วยจุดถูกเผยแพร่
3. หลังอัปโหลดขึ้น Play Console แล้ว ไปที่ Test and release → App integrity →
   App signing คัดลอก **SHA-256 ของ App signing key** มาเพิ่มในรายการ
   `sha256_cert_fingerprints` (เก็บของเดิมไว้ด้วย)

ไฟล์ทดสอบ (`app-debug.apk` / หน้า download) เซ็นด้วยกุญแจทดสอบ `android/app/test-signing.jks`
ซึ่งตั้งใจเก็บไว้ใน repo ให้ fingerprint คงที่ ใช้กับรุ่นทดสอบเท่านั้น
(ไฟล์ที่ส่ง Play Store ใช้กุญแจ upload ส่วนตัวจาก Secrets)

## 4. ส่งขึ้น Play Store

1. สมัคร Google Play Console (ค่าธรรมเนียมครั้งเดียว 25 USD)
2. Create app → ชื่อ "เหมียวไดอารี่"
3. อัปโหลด `.aab` ในแทร็ก Testing ก่อน (บัญชีส่วนตัวใหม่ต้องทดสอบแบบปิด
   กับผู้ทดสอบอย่างน้อย 12 คน 14 วัน ก่อนเปิด Production)
4. กรอก Store listing: ไอคอน `android/play-store-icon-512.png`,
   ภาพหน้าจอ, คำอธิบาย, นโยบายความเป็นส่วนตัว (ต้องมี เพราะแอปเก็บข้อมูลบัญชี Google)
5. กรอก Data safety / Content rating แล้วส่งตรวจ

ทุกครั้งที่ build ใหม่ เลข versionCode จะเพิ่มเองตามลำดับการรันของ Actions
