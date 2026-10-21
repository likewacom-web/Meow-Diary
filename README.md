# เหมียวไดอารี่ (Meow Diary)

สมุดโน้ตพาสเทลกับน้องแมว ใช้ได้ทั้งบนเว็บและเป็นแอป Android

- เว็บ: https://likewacom-web.github.io/Meow-Diary/
- ดาวน์โหลดแอปทดสอบ: https://likewacom-web.github.io/Meow-Diary/download/
- นโยบายความเป็นส่วนตัว: https://likewacom-web.github.io/Meow-Diary/privacy.html

## โครงสร้างไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | โครงหน้าแอป (HTML) |
| `css/app.css` | หน้าตาและธีมทั้งหมด |
| `js/app.js` | การทำงานของแอป (Firebase, โน้ต, น้องแมว ฯลฯ) |
| `js/i18n.js` | ข้อความภาษาไทย / อังกฤษ |
| `sw.js` | Service worker ให้เปิดแอปได้แบบออฟไลน์ |
| `stickers/` | สติกเกอร์แมวแบบ LINE (สร้างใหม่ได้ด้วย `tools/make-stickers.js`) |
| `privacy.html` | นโยบายความเป็นส่วนตัวและวิธีลบบัญชี |
| `android/` | แอป Android (WebView + ล็อกอิน Google แบบแอป) ดู `android/README.md` |

แก้ไฟล์ใน `js/` หรือ `css/` แล้วเพิ่มเลขเวอร์ชัน `CACHE` ใน `sw.js` ทุกครั้ง เพื่อให้เครื่องผู้ใช้โหลดไฟล์ใหม่
