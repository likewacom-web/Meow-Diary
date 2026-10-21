// Meow Diary app (ES module). Styles: css/app.css, text: js/i18n.js.
const safeStorage = (() => {
  const mem = Object.create(null);
  return {
    getItem(key) { try { return window.localStorage.getItem(key); } catch (_) { return Object.prototype.hasOwnProperty.call(mem,key) ? mem[key] : null; } },
    setItem(key,value) { const v=String(value); mem[key]=v; try { window.localStorage.setItem(key,v); } catch (_) {} },
    removeItem(key) { delete mem[key]; try { window.localStorage.removeItem(key); } catch (_) {} },
    clear() { for (const k of Object.keys(mem)) delete mem[k]; try { window.localStorage.clear(); } catch (_) {} }
  };
})();

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInWithCredential, getRedirectResult, onAuthStateChanged, signOut, reauthenticateWithPopup, reauthenticateWithCredential, deleteUser } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, updateDoc, deleteDoc, getDocs, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";



import { translations, offlineI18n, featureTranslations, extraI18n, missionUiI18n, languagePanelText, driveI18n, navI18n, pinI18n } from './i18n.js';

let language=safeStorage.getItem('note-language')||'th';if(language!=='th'&&language!=='en')language='th';
const tr=k=>(translations[language]&&translations[language][k])||translations.en[k]||k;

// Android app: reminders go through native notifications (WebView has no Notification API).
if(window.MeowAndroid&&!('Notification' in window)){
 window.Notification=class{
  constructor(title,opts={}){try{window.MeowAndroid.notify(String(title||''),String(opts.body||''))}catch{}}
  static get permission(){try{return window.MeowAndroid.notificationPermission()}catch{return 'denied'}}
  static requestPermission(){try{window.MeowAndroid.requestNotificationPermission()}catch{}return Promise.resolve(window.Notification.permission)}
 };
}
// Android back button: close whatever is open before leaving the app.
window.meowHandleBack=()=>{
 const dlg=document.querySelector('.appDialog [data-v="0"]');if(dlg){dlg.click();return true}
 const shown=sel=>document.querySelector(sel+'.show');
 if(shown('#imgViewer')){$('imgViewer').classList.remove('show');return true}
 for(const id of ['addSheet','templateSheet','catStickerSheet','menuSheet'])if(shown('#'+id)){closeSheet(id);return true}
 if(shown('#overlay')){closeEditor();return true}
 for(const sel of ['#aiOverlay','#languageOverlay','#settingsOverlay','.calendarModal']){const el=shown(sel);if(el){el.classList.remove('show');document.body.style.overflow='';return true}}
 if(!$('petView').hidden){showTab('notes');return true}
 if(!$('searchWrap').hidden){$('searchClose').click();return true}
 return false;
};
const ot=k=>(offlineI18n[language]||offlineI18n.en)[k]||offlineI18n.en[k];
let lastSnapMeta=null;
function updateSyncStatus(){
 if(!currentUser)return;
 if(!navigator.onLine)$('syncStatus').textContent=ot('offline');
 else if(lastSnapMeta?.hasPendingWrites)$('syncStatus').textContent=ot('pending');
 else if(lastSnapMeta&&!lastSnapMeta.fromCache)$('syncStatus').textContent=tr('online');
 else $('syncStatus').textContent=tr('syncing');
}
// Firestore applies writes to its local cache right away and only resolves the
// promise once the server confirms, so offline we must not wait on it.
function queueWrite(promise,onError){promise.catch(e=>toast(onError?onError(e):e.message))}
addEventListener('online',()=>{if(currentUser)toast(ot('backOnline'));updateSyncStatus()});
addEventListener('offline',updateSyncStatus);
const featureKeys=["calendar", "mood", "templates", "favorites", "voice", "trash", "allCategories", "addCategory", "dark", "light", "exportTxt", "exportPdf", "moodTitle", "chooseMood", "shortNote", "saveMood", "daysSaved", "selectDay", "noNotesDay", "noTitle", "daily", "shopping", "study", "idea", "chooseTemplate", "noTemplate", "sticker", "draw", "clearDrawing", "attachDrawing", "drawingCleared", "drawingSaved", "attachments", "voiceNote", "startRecording", "stopRecording", "recording", "voiceReady", "noMic", "favoritesOnly", "favorite", "moodLabel", "noMood", "happy", "calm", "neutral", "sad", "stressed", "excited", "warm", "tired", "syncMoodFail", "moodSaved", "reminder", "category", "noneCategory", "addItem", "add", "aiSummary", "aiOffline", "aiAddText", "summary", "pinPrompt", "pinError", "unlock", "pinLabel", "restore", "purge", "moveTrash", "trashEmpty", "deleteConfirm", "savedToast", "exportTitle", "settings", "finish"];

const ft=k=>(featureTranslations[language]&&featureTranslations[language][k])||featureTranslations.en[k]||k;




const missionUi=k=>(missionUiI18n[language]&&missionUiI18n[language][k])||missionUiI18n.en[k]||k;

const et=k=>(extraI18n[language]&&extraI18n[language][k])||extraI18n.en[k]||k;
function applyExtraLanguage(){
 const ids={petTitle:'petName',petMessage:'petWelcome',petFeed:'feed',petPlay:'play',petSleep:'sleep',missionTitle:'missionTitle',openMoodStats:'stats',openBackup:'backup',openWidget:'widget',statsTitle:'stats',statsHint:'statsHint',backupTitle:'backup',backupHint:'backupHint',exportBackup:'exportBackup',importBackupBtn:'importBackup',backupCaution:'backupCaution',widgetTitle:'widget',widgetPetName:'petName',widgetWrite:'write',widgetHint:'widgetHint'};
 Object.entries(ids).forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.textContent=et(key)});
 const avatar=document.getElementById('petAvatar');if(avatar)avatar.setAttribute('aria-label',et('petName'));
 if(typeof renderPet==='function')renderPet();
}




function driveText(key){return (driveI18n[language]||driveI18n.en)[key]||driveI18n.en[key]||key}
function applyDriveLanguage(){} // Drive attachments were removed; old notes keep their links.

function applyLanguage(){
 if(typeof applyNavLanguage==='function')try{applyNavLanguage()}catch{}
 const lp=languagePanelText[language]||languagePanelText.en;
 const quickLabel=$('languageQuickLabel');if(quickLabel)quickLabel.textContent=lp.button;
 const panelTitle=$('languagePanelTitle');if(panelTitle)panelTitle.textContent=lp.title;
 const panelLabel=$('languagePanelLabel');if(panelLabel)panelLabel.textContent=lp.label;
 const panelHint=$('languagePanelHint');if(panelHint)panelHint.textContent=lp.hint;
 const panelClose=$('languagePanelClose');if(panelClose)panelClose.setAttribute('aria-label',lp.close);
 const quickSelect=$('languageQuickSelect');if(quickSelect&&quickSelect.value!==language)quickSelect.value=language;
 const settingsSelect=$('languageSelect');if(settingsSelect&&settingsSelect.value!==language)settingsSelect.value=language;
 const labels={openCalendar:'calendar',openMood:'mood',openTemplates:'templates',favoritesFilter:favoriteOnly?'favoritesOnly':'favorites',voiceQuick:'voice',exportTxt:'exportTxt',exportPdf:'exportPdf',themeToggle:document.body.classList.contains('dark')?'light':'dark',newCategory:'addCategory'};
 Object.entries(labels).forEach(([id,key])=>{const el=$(id);if(el)el.textContent=ft(key)});
 const cat=$('categoryFilter');if(cat&&cat.options.length)cat.options[0].text=ft('allCategories');
 const textLabels={noteMood:'moodLabel',noteCategory:'category',noteReminder:'reminder',noteFiles:'attachments'};
 document.querySelectorAll('.editorTools label').forEach(el=>{const inp=el.querySelector('input,select');if(inp&&textLabels[inp.id])el.childNodes[0].textContent=ft(textLabels[inp.id])+' ';});
 const headings=[['calendarModal','calendar'],['moodModal','moodTitle']];headings.forEach(([id,key])=>{const h=$(id)?.querySelector('h2');if(h)h.textContent=ft(key)});
 $('drawClear').textContent=ft('clearDrawing');$('drawSave').textContent=ft('attachDrawing');$('aiSummary').textContent=ft('aiSummary');$('recordVoice').textContent=ft('startRecording');$('stopVoice').textContent=ft('stopRecording');$('moodSave').textContent=ft('saveMood');
 const stickerLabel=$('noteStickers')?.previousElementSibling;if(stickerLabel)stickerLabel.childNodes[0].textContent=ft('sticker')+' ';
 const canvasLabel=$('drawCanvas')?.closest('label');if(canvasLabel)canvasLabel.childNodes[0].textContent=ft('draw')+' ';
 const voiceLabel=$('recordVoice')?.closest('label');if(voiceLabel)voiceLabel.childNodes[0].textContent=ft('voiceNote')+' ';
 const attachmentLabel=$('noteFiles')?.closest('label');if(attachmentLabel)attachmentLabel.childNodes[0].textContent=ft('attachments')+' ';
 document.documentElement.lang=language;
 document.querySelectorAll('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;if(translations[language]?.[key])el.textContent=tr(key)});
 document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>el.placeholder=tr(el.dataset.i18nPlaceholder));
 document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',tr(el.dataset.i18nAria)));
 $('settingsTitle').textContent=tr('settings');$('languageLabel').textContent=tr('language');$('languageHint').textContent=tr('languageHint');$('accountSettingsLabel').textContent=tr('account');$('aboutLabel').textContent=tr('about');$('aboutText').textContent=tr('aboutText');$('settingsSignIn').textContent=tr('signInGoogle');$('settingsDone').textContent=language==='th'?'เสร็จสิ้น':language==='ja'?'完了':language==='zh'?'完成':language==='ko'?'완료':'Done';
 $('settingsAccountStatus').textContent=currentUser?(currentUser.email||'Google') :tr('notSignedIn');
 $('googleSignIn').lastChild.textContent=tr('signIn');
 applyExtraLanguage();
 applyDriveLanguage();
 render();
}


const colorPresets={
 lavender:{bg:'#fdf9ff',accent:'#8b73c6',ink:'#35313d',notes:['#e9e1ff','#ddf4e7','#ffe4d6','#fff1b8','#ffe0ec']},
 peach:{bg:'#fff8f2',accent:'#c87961',ink:'#49352f',notes:['#ffe1d4','#f8d9e8','#fff0b8','#e4efcf','#dcecff']},
 mint:{bg:'#f4fcf7',accent:'#4d9a7b',ink:'#2f4038',notes:['#d8f1e3','#e4edc9','#ffe3d2','#d8edff','#f8d9e8']},
 ocean:{bg:'#f3faff',accent:'#4d8eb9',ink:'#263b4b',notes:['#d8edff','#d9f3ef','#e4e1ff','#fff0c2','#f8dce8']},
 rose:{bg:'#fff6fa',accent:'#c16c91',ink:'#49303d',notes:['#f8d9e8','#ffe4d6','#e9e1ff','#d9f1e5','#fff0b8']},
 lemon:{bg:'#fffdf0',accent:'#a38b32',ink:'#423d25',notes:['#fff0a8','#e4edc9','#ffe1d4','#dcecff','#f8d9e8']},
 sky:{bg:'#f4f8ff',accent:'#657fc4',ink:'#303850',notes:['#dce6ff','#d8edff','#e9e1ff','#d9f3e7','#ffe4d6']},
 lilac:{bg:'#faf5ff',accent:'#986ac0',ink:'#3d3048',notes:['#ead8ff','#f8d9e8','#d8edff','#d9f1e5','#fff0b8']},
 sage:{bg:'#f6f8f1',accent:'#75865b',ink:'#343d2e',notes:['#e1e8ce','#d9f1e5','#fff0b8','#ffe1d4','#dce6ff']},
 cocoa:{bg:'#faf5f0',accent:'#9b725b',ink:'#44352d',notes:['#ead8c9','#f4dfd2','#e5e2d9','#d9e7d8','#eadfff']},
 mono:{bg:'#f7f7f7',accent:'#555555',ink:'#292929',notes:['#e4e4e4','#eeeeee','#dadada','#f0e8e8','#e3e7eb']},
 night:{bg:'#211f29',accent:'#b8a5f2',ink:'#f2edf7',notes:['#403751','#29473b','#4d3834','#4a432c','#4b3340']}
};
function applyColorConfig(cfg,save=true){
 // Never leave text or note colours from the other theme (e.g. light text on a light
 // background after switching Night -> light), which made notes unreadable.
 const darkBg=isDarkHex(cfg.bg),base=darkBg?colorPresets.night:colorPresets.lavender;
 if(isDarkHex(cfg.ink)===darkBg)cfg={...cfg,ink:base.ink};
 if(Array.isArray(cfg.notes)&&cfg.notes.length&&cfg.notes.every(c=>isDarkHex(c)!==darkBg))cfg={...cfg,notes:[...base.notes]};
 document.body.classList.toggle('dark',darkBg);
 document.body.style.setProperty('--bg',cfg.bg);document.body.style.setProperty('--purple',cfg.accent);document.body.style.setProperty('--ink',cfg.ink);
 colors=[...cfg.notes];document.body.style.setProperty('--lav',colors[0]);document.body.style.setProperty('--mint',colors[1]);document.body.style.setProperty('--peach',colors[2]);document.body.style.setProperty('--yellow',colors[3]);document.body.style.setProperty('--pink',colors[4]);
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',cfg.bg);try{window.MeowAndroid?.setThemeColor(cfg.bg)}catch{}
 if(save){safeStorage.setItem('note-color-config',JSON.stringify(cfg));safeStorage.setItem('note-custom-note-colors',JSON.stringify(colors))}
 document.querySelectorAll('.swatch').forEach((b,i)=>{if(colors[i])b.style.background=colors[i]});
 $('appBgColor').value=cfg.bg;$('appAccentColor').value=cfg.accent;$('appInkColor').value=cfg.ink;
 $('customNotePalette').innerHTML=colors.map((c,i)=>`<label>โน้ต ${i+1}<input type="color" data-custom-note="${i}" value="${c}" aria-label="สีโน้ต ${i+1}"></label>`).join('');
 render();
}
function readColorConfig(){return {bg:$('appBgColor').value,accent:$('appAccentColor').value,ink:$('appInkColor').value,notes:[...$('customNotePalette').querySelectorAll('[data-custom-note]')].sort((a,b)=>Number(a.dataset.customNote)-Number(b.dataset.customNote)).map(x=>x.value)}}
function initColorStudio(){
 let cfg;try{cfg=JSON.parse(safeStorage.getItem('note-color-config')||'null')}catch{}
 if(!cfg)cfg=colorPresets.lavender;
 applyColorConfig(cfg,false);
 const activatePreset=name=>{const cfg=colorPresets[name];if(!cfg)return;document.body.classList.toggle('dark',name==='night');safeStorage.setItem('note-dark',name==='night'?'1':'0');applyColorConfig(cfg,true);document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===name));$('themeToggle').textContent=name==='night'?'☀️ ธีมสว่าง':'🌙 ธีมมืด'};
 document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>activatePreset(b.dataset.preset)));
 // Follow the phone's light/dark setting: Night when it is dark, the chosen light theme otherwise.
 const sysDark=matchMedia('(prefers-color-scheme: dark)');
 if(safeStorage.getItem('meow-theme-auto')===null)safeStorage.setItem('meow-theme-auto',safeStorage.getItem('note-color-config')?'0':'1');
 const themeAuto=()=>safeStorage.getItem('meow-theme-auto')==='1';
 const lightPreset=()=>{const n=safeStorage.getItem('meow-light-preset');return colorPresets[n]&&n!=='night'?n:'lavender'};
 const followSystem=()=>{if(themeAuto())activatePreset(sysDark.matches?'night':lightPreset())};
 window.meowThemeAutoOff=()=>{safeStorage.setItem('meow-theme-auto','0');$('themeAuto').checked=false};
 sysDark.addEventListener?.('change',followSystem);
 $('themeAuto').checked=themeAuto();
 $('themeAuto').addEventListener('change',e=>{safeStorage.setItem('meow-theme-auto',e.target.checked?'1':'0');followSystem()});
 document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{const night=b.dataset.preset==='night';if(!night)safeStorage.setItem('meow-light-preset',b.dataset.preset);if(themeAuto()&&night!==sysDark.matches)window.meowThemeAutoOff()}));
 followSystem();
 $('applyCustomColors').addEventListener('click',()=>{const cfg=readColorConfig();applyColorConfig(cfg,true);document.querySelectorAll('[data-preset]').forEach(b=>b.classList.remove('active'));document.body.classList.toggle('dark',isDarkHex(cfg.bg));safeStorage.setItem('note-dark',document.body.classList.contains('dark')?'1':'0');toast('ใช้ชุดสีใหม่แล้ว ✨')});
 $('resetCustomColors').addEventListener('click',()=>{document.body.classList.remove('dark');safeStorage.setItem('note-dark','0');activatePreset('lavender');toast('คืนค่าสีเริ่มต้นแล้ว')});
 $('customNotePalette').addEventListener('input',e=>{if(e.target.matches('[data-custom-note]')){const i=Number(e.target.dataset.customNote);colors[i]=e.target.value;document.querySelectorAll('.swatch').forEach((b,j)=>{if(colors[j])b.style.background=colors[j]})}});
}
function isDarkHex(hex){const n=parseInt(hex.replace('#',''),16),r=n>>16&255,g=n>>8&255,b=n&255;return (r*299+g*587+b*114)/1000<125}


const firebaseConfig = {
  apiKey: "AIzaSyAeM-nMoOW_TUkyepwhGy3JLGzn4U3NgIQ",
  authDomain: "meow-diary-5265d.firebaseapp.com",
  projectId: "meow-diary-5265d",
  storageBucket: "meow-diary-5265d.firebasestorage.app",
  messagingSenderId: "731296956907",
  appId: "1:731296956907:web:eefaec7b348c797f9dd9ae",
  measurementId: "G-LNYSN55NKG"
};

const $=id=>document.getElementById(id);
let colors=JSON.parse(safeStorage.getItem('note-custom-note-colors')||'null')||['#e9e1ff','#ddf4e7','#ffe4d6','#fff1b8','#ffe0ec'];
let app,auth,db,storage,currentUser=null,notes=[],noteImages=[],editingId=null,selectedColor=0,filter='all',unsubscribeNotes=null,toastTimer,checkItems=[],existingAttachments=[],selectedStickers=[],drawingData='',mediaRecorder=null,recordedChunks=[],favoriteOnly=false,calendarDate=new Date();
let configured=!Object.values(firebaseConfig).some(v=>v.startsWith("PASTE_"));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Move a note to the trash (or back), on this device or in the account.
function setNoteTrashed(id,trashed){
 const deletedAt=trashed?new Date().toISOString():null;
 if(!currentUser){notes=notes.map(n=>n.id===id?{...n,deletedAt,updatedAt:Date.now()}:n);persistLocalNotes(notes);render()}
 else queueWrite(setDoc(doc(noteCollection(),id),{deletedAt,updatedAt:serverTimestamp()},{merge:true}));
}
// A toast with a button (e.g. Undo) that stays a little longer.
function toastAction(msg,label,action){
 const t=$('toast');t.textContent=msg;const b=document.createElement('button');b.type='button';b.className='toastBtn';b.textContent=label;
 b.onclick=()=>{t.classList.remove('show','hasAction');action()};t.appendChild(b);t.classList.add('show','hasAction');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show','hasAction'),5000);
}
function toast(msg){$('toast').classList.remove('hasAction');$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400)}
function dateLabel(ts){try{return new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(ts||Date.now()))}catch{return ''}}
function noteCollection(){return collection(db,'users',currentUser.uid,'notes')}
function safeDate(v){if(!v)return '';try{const d=new Date(v);return isNaN(d)?'':d.toISOString().slice(0,16)}catch{return ''}}
function render(){
 const q=$('search').value.trim().toLocaleLowerCase();
 const cat=$('categoryFilter').value;
 const list=notes.filter(n=>{
  if(filter==='pinned'&&!(n.pinned||n.favorite))return false;
  if(filter==='trash'&&!n.deletedAt)return false;
  if(filter!=='trash'&&n.deletedAt)return false;
  if(cat&&n.category!==cat)return false;
  return (`${n.title} ${stripImageTokens(n.body)} ${n.category||''}`).toLocaleLowerCase().includes(q);
 }).sort((a,b)=>Number(!!(b.pinned||b.favorite))-Number(!!(a.pinned||a.favorite))||noteSorters[sortBy](a,b));
 updateFilterTag();afterNotesChanged();
 $('count').textContent=`${list.length} ${language==='th'?'บันทึก':'notes'}`;
 $('notes').innerHTML=list.length?list.map(n=>`<article class="note ${n.deletedAt?'deleted':''}" style="--c:${colors[n.colorIndex]||colors[0]};background:var(--c)" data-open="${esc(n.id)}" tabindex="0" role="button">${n.images?.length?`<img class="noteThumb${n.images[0].sticker?' sticker':''}" src="${esc(n.images[0].src)}" alt="" loading="lazy">`:''}<div class="notehead"><div class="notetitle">${esc(n.title||tr('noTitle'))}</div>${n.pinned||n.favorite?'<span>📌</span>':''}</div><div class="preview">${n.kind==='checklist'||(!n.body&&n.checklist?.length)?esc((n.checklist||[]).slice(0,4).map(x=>(x.done?'☑ ':'☐ ')+x.text).join('\n')||tr('noContent')):esc(stripImageTokens(n.body)||tr('noContent'))}</div><div class="noteMeta">${n.category?`<span class="metaPill">▣ ${esc(n.category)}</span>`:''}${n.checklist?.length?`<span class="metaPill">☑ ${n.checklist.filter(x=>x.done).length}/${n.checklist.length}</span>`:''}${n.images?.length>1?`<span class="metaPill">🖼️ ${n.images.length}</span>`:''}${n.attachments?.length?`<span class="metaPill">📎 ${n.attachments.length}</span>`:''}${n.reminderAt?`<span class="metaPill">⏰ ${esc(new Date(n.reminderAt).toLocaleString())}${n.reminderRepeat?' 🔁':''}</span>`:''}</div><div class="notefoot"><time>${dateLabel(n.updatedAt)}</time>${n.deletedAt?`<button class="iconbtn" data-restore="${esc(n.id)}" aria-label="กู้คืน">↶</button><button class="iconbtn" data-purge="${esc(n.id)}" aria-label="ลบถาวร">×</button>`:`<button class="iconbtn" data-pin="${esc(n.id)}" aria-label="ปักหมุด">${n.pinned?'📌':'📍'}</button><button class="iconbtn" data-delete="${esc(n.id)}" aria-label="ย้ายลงถังขยะ" title="ลบ">🗑️</button>`}</div></article>`).join(''):`<div class="empty"><div style="font-size:45px">📝</div><div>${q?tr('notFound'):filter==='trash'?'ถังขยะว่าง':tr('emptyTitle')}</div><small>${q?tr('trySearch'):tr('emptyHint')}</small></div>`;
}
function watchNotes(){
 if(unsubscribeNotes)unsubscribeNotes();
 if(!currentUser){notes=loadLocalNotes();render();$('syncStatus').textContent=nt('onDevice');return}
 $('syncStatus').textContent=tr('syncing');
 unsubscribeNotes=onSnapshot(query(noteCollection(),orderBy('updatedAt','desc')),{includeMetadataChanges:true},snap=>{
   lastSnapMeta=snap.metadata;
   notes=snap.docs.map(d=>{const x=d.data({serverTimestamps:'estimate'});return {id:d.id,title:x.title||'',body:x.body||'',pinned:!!x.pinned,colorIndex:Number(x.colorIndex)||0,category:x.category||'',checklist:Array.isArray(x.checklist)?x.checklist:[],reminderAt:x.reminderAt||'',reminderRepeat:x.reminderRepeat||'',reminderSentAt:x.reminderSentAt||null,attachments:Array.isArray(x.attachments)?x.attachments:[],deletedAt:x.deletedAt||null,locked:!!x.locked,mood:x.mood||'',stickers:Array.isArray(x.stickers)?x.stickers:[],favorite:!!x.favorite,drawingData:x.drawingData||'',images:Array.isArray(x.images)?x.images:[],kind:x.kind==='checklist'?'checklist':'text',createdAt:x.createdAt?.toMillis?.()||x.createdAt||Date.now(),updatedAt:x.updatedAt?.toMillis?.()||Date.now()}});
   updateSyncStatus();render();if(typeof renderPet==='function')renderPet();checkReminders();
 },err=>{$('syncStatus').textContent='! ซิงก์ไม่สำเร็จ';$('notice').textContent='Firestore แจ้งข้อผิดพลาด: '+err.message;});
}
async function uploadAttachments(){return [...existingAttachments]}
async function saveNote(){
 const title=$('noteTitle').value.trim(),body=$('noteBody').value.trim();
 if(!title&&!body&&!checkItems.length){toast(tr('enterText'));return}
 const id=editingId||crypto.randomUUID(),old=notes.find(n=>n.id===id);
 if(noteKind==='checklist')checkItems=checkItems.filter(x=>String(x.text||'').trim());
 const reminder=$('noteReminder').value?new Date($('noteReminder').value).toISOString():'';
 const data={id,title,body,colorIndex:selectedColor,pinned:$('notePinned').checked,category:$('noteCategory').value,mood:$('noteMood').value||'',stickers:selectedStickers,favorite:$('noteFavorite').checked,checklist:checkItems,reminderAt:reminder,reminderRepeat:reminder?$('noteRepeat').value:'',reminderSentAt:old?.reminderAt===reminder?(old?.reminderSentAt||null):null,attachments:existingAttachments,images:usedNoteImages(),kind:noteKind,drawingData:drawingData||old?.drawingData||'',deletedAt:null,locked:!!old?.locked,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};
 if(!currentUser){const next=[data,...notes.filter(n=>n.id!==id)];if(!persistLocalNotes(next)){toast(nt('storageFull'));return}notes=next;render();closeEditor();toast('บันทึกในอุปกรณ์นี้แล้ว ✓');return}
 data.attachments=await uploadAttachments(id);
 queueWrite(setDoc(doc(noteCollection(),id),{...data,updatedAt:serverTimestamp()},{merge:true}));
 closeEditor();toast(!navigator.onLine?ot('savedOffline'):tr('saved'))
}
function drawChecklist(items=[]){
 checkItems=items.map(x=>({...x}));const box=$('checklistBox');
 box.innerHTML=checkItems.map((x,i)=>`<div class="checkRow"><input type="checkbox" data-checkdone="${i}" ${x.done?'checked':''}><input type="text" data-checktext="${i}" value="${esc(x.text)}" aria-label="รายการ ${i+1}"><button type="button" data-checkremove="${i}">×</button></div>`).join('')||'<small style="color:var(--muted)">ยังไม่มีรายการ</small>';
}
function drawAttachments(){
 $('attachmentList').innerHTML=existingAttachments.map((a,i)=>`<span>📎 <a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)}</a> <button type="button" data-attachremove="${i}">×</button></span>`).join('');
}
function openEditor(n=null){
 editingId=n?.id||null;noteImages=[...(n?.images||[])].map(im=>({...im}));selectedColor=n?.colorIndex||0;existingAttachments=[...(n?.attachments||[])];
 $('editorHeading').textContent=n?tr('editNote'):tr('newNote');$('noteTitle').value=n?.title||'';$('noteBody').value=n?.body||'';$('notePinned').checked=!!(n?.pinned||n?.favorite);
 $('noteCategory').value=n?.category||'';$('noteMood').value=n?.mood||'';$('noteFavorite').checked=false;selectedStickers=[...(n?.stickers||[])];drawingData=n?.drawingData||'';$('noteReminder').value=safeDate(n?.reminderAt);$('noteRepeat').value=n?.reminderRepeat||'';$('aiResult').textContent='';
 drawNoteImages();$('imageStatus').textContent='';$('drawSection').hidden=!(n?.drawingData);drawChecklist(n?.checklist||[]);setNoteKind(n?(n.kind||(n.checklist?.length&&!n.body?'checklist':'text')):nextNoteKind);nextNoteKind='text';drawAttachments();drawStickerSelection();restoreDrawing();$('delete').hidden=!n;
 document.querySelectorAll('.swatch').forEach(b=>b.classList.toggle('selected',Number(b.dataset.color)===selectedColor));
 $('overlay').classList.add('show');document.body.style.overflow='hidden';savedRange=null;setTimeout(()=>$('noteTitle').focus(),100)
}
function closeEditor(){$('overlay').classList.remove('show');document.body.style.overflow='';editingId=null}
function checkReminders(){
 if(window.MeowAndroid?.scheduleReminders)return; // the Android app schedules these itself
 if(!('Notification'in window)||Notification.permission!=='granted')return;
 const now=Date.now();
 notes.filter(n=>n.reminderAt&&!n.deletedAt&&!n.reminderSentAt&&new Date(n.reminderAt).getTime()<=now).forEach(async n=>{
  new Notification(n.title||'Note reminder',{body:stripImageTokens(n.body)||'ถึงเวลาเปิดดูโน้ตของคุณ'});
  // Repeating reminders move to their next time; one-off reminders are marked as sent.
  const patch=n.reminderRepeat?{reminderAt:new Date(nextOccurrence(new Date(n.reminderAt).getTime(),n.reminderRepeat,now)).toISOString()}:{reminderSentAt:new Date().toISOString()};
  if(currentUser)setDoc(doc(noteCollection(),n.id),{...patch,updatedAt:serverTimestamp()},{merge:true}).catch(()=>{});
  else{Object.assign(n,patch);persistLocalNotes(notes)}
 });
}
setInterval(checkReminders,30000);
$('add').addEventListener('click',()=>openSheet('addSheet'));

// ---- App shell UI: bottom nav, add sheet, menu, sort and view ----

const nt=k=>(navI18n[language]||navI18n.en)[k]||navI18n.en[k];
const noteSorters={
 updated:(a,b)=>(b.updatedAt||0)-(a.updatedAt||0),
 created:(a,b)=>(b.createdAt||0)-(a.createdAt||0),
 title:(a,b)=>String(a.title||'').localeCompare(String(b.title||''),language),
 color:(a,b)=>(a.colorIndex||0)-(b.colorIndex||0)||(b.updatedAt||0)-(a.updatedAt||0)
};
let sortBy=noteSorters[safeStorage.getItem('meow-sort')]?safeStorage.getItem('meow-sort'):'updated';
let viewMode=safeStorage.getItem('meow-view')==='grid'?'grid':'list';
function applyViewMode(){$('notes').className=viewMode;$('viewToggle').textContent=viewMode==='list'?'▦':'☰'}
function updateFilterTag(){
 const parts=[];if(filter==='pinned')parts.push(nt('pinned'));if(filter==='trash')parts.push(nt('trash')+' · '+nt('trash30'));if(favoriteOnly)parts.push(nt('favorites'));
 const cat=$('categoryFilter').value;if(cat)parts.push('▣ '+cat);
 $('filterTag').hidden=!parts.length;$('filterTag').textContent=parts.join(' · ')+'  ×';
}
function applyNavLanguage(){
 document.querySelectorAll('[data-nav]').forEach(el=>el.textContent=nt(el.dataset.nav));
 $('menuShowLabel').textContent=nt('show');$('menuToolsLabel').textContent=nt('tools');$('menuSettings').textContent=nt('settings');
 [...$('sortBy').options].forEach(o=>o.textContent=nt(o.value));
}
function openSheet(id){$(id).classList.add('show');document.body.style.overflow='hidden'}
function closeSheet(id){$(id).classList.remove('show');if(!$('overlay').classList.contains('show'))document.body.style.overflow=''}
function showTab(tab){
 document.querySelectorAll('.bottomNav [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 const pet=tab==='pet';$('petView').hidden=!pet;$('notes').hidden=pet;$('sortBar').hidden=pet;$('add').hidden=pet;
 if(pet&&typeof renderPet==='function')renderPet();
 scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('.sheetOverlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)closeSheet(o.id)}));
$('addSheet').addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;closeSheet('addSheet');const kind=b.dataset.add;
 if(kind==='text')openEditor();
 else if(kind==='checklist'){nextNoteKind='checklist';openEditor();setTimeout(()=>focusCheckItem(0),150)}
 else if(kind==='image'){openEditor();$('imagePick').click()}
 else if(kind==='draw'){openEditor();$('drawSection').hidden=false;setTimeout(()=>$('drawSection').scrollIntoView({block:'center'}),150)}
 else if(kind==='template')$('openTemplates').click();
 else if(kind==='voice')$('voiceQuick').click();
});
// Menu actions close the sheet once they've run (selects stay open while choosing).
$('menuSheet').addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.closest('.account'))setTimeout(()=>closeSheet('menuSheet'),0)});
$('categoryFilter').addEventListener('change',()=>{render();closeSheet('menuSheet')});
$('menuSettings').addEventListener('click',()=>$('settingsOpen').click());
$('googleSignIn').addEventListener('click',()=>closeSheet('menuSheet'));
document.querySelectorAll('.bottomNav [data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
$('navCalendar').addEventListener('click',()=>$('openCalendar').click());
$('navMenu').addEventListener('click',()=>openSheet('menuSheet'));
$('navSearch').addEventListener('click',()=>{showTab('notes');$('searchWrap').hidden=false;$('search').focus()});
$('searchClose').addEventListener('click',()=>{$('search').value='';$('searchWrap').hidden=true;render()});
$('sortBy').value=sortBy;
$('sortBy').addEventListener('change',e=>{sortBy=e.target.value;safeStorage.setItem('meow-sort',sortBy);render()});
$('viewToggle').addEventListener('click',()=>{viewMode=viewMode==='list'?'grid':'list';safeStorage.setItem('meow-view',viewMode);applyViewMode()});
$('filterTag').addEventListener('click',()=>{filter='all';favoriteOnly=false;$('categoryFilter').value='';document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x.dataset.filter==='all'));applyLanguage();render()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.sheetOverlay.show').forEach(o=>closeSheet(o.id))});
applyViewMode();applyNavLanguage();

// ---- Checklist notes (ColorNote style): the whole note is a list of items ----
var noteKind='text',nextNoteKind='text';
function setNoteKind(kind){
 noteKind=kind==='checklist'?'checklist':'text';const list=noteKind==='checklist';
 $('checkMain').hidden=!list;$('noteRich').hidden=list;$('addImage').hidden=list;$('takePhoto').hidden=list;$('addCatSticker').hidden=list;$('checklistSection').hidden=list||!checkItems.length;
 $('kindToggle').textContent=list?nt('toText'):nt('toChecklist');
 if(list)drawCheckMain();
}
function drawCheckMain(){
 $('checkMain').innerHTML=checkItems.map((x,i)=>`<div class="checkItem${x.done?' done':''}"><input type="checkbox" data-ci-done="${i}" ${x.done?'checked':''} aria-label="${esc(nt('itemPlaceholder'))} ${i+1}"><input type="text" data-ci-text="${i}" value="${esc(x.text)}" placeholder="${esc(nt('itemPlaceholder'))}" enterkeyhint="next"><button type="button" data-ci-remove="${i}" aria-label="ลบ">×</button></div>`).join('')
  +`<button type="button" class="checkAdd" data-ci-add>＋ ${esc(nt('addItem'))}</button>`;
}
function focusCheckItem(i){const el=$('checkMain').querySelector(`[data-ci-text="${i}"]`);if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length)}else{checkItems.push({text:'',done:false});drawCheckMain();focusCheckItem(checkItems.length-1)}}
$('checkMain').addEventListener('click',e=>{
 if(e.target.closest('[data-ci-add]')){checkItems.push({text:'',done:false});drawCheckMain();focusCheckItem(checkItems.length-1);return}
 const rm=e.target.closest('[data-ci-remove]');if(rm){checkItems.splice(Number(rm.dataset.ciRemove),1);drawCheckMain();return}
});
$('checkMain').addEventListener('change',e=>{const b=e.target.closest('[data-ci-done]');if(b){checkItems[Number(b.dataset.ciDone)].done=b.checked;b.parentElement.classList.toggle('done',b.checked)}});
$('checkMain').addEventListener('input',e=>{const t=e.target.closest('[data-ci-text]');if(t)checkItems[Number(t.dataset.ciText)].text=t.value});
$('checkMain').addEventListener('keydown',e=>{
 const t=e.target.closest('[data-ci-text]');if(!t)return;const i=Number(t.dataset.ciText);
 if(e.key==='Enter'){e.preventDefault();checkItems.splice(i+1,0,{text:'',done:false});drawCheckMain();focusCheckItem(i+1)}
 else if(e.key==='Backspace'&&!t.value&&checkItems.length>1){e.preventDefault();checkItems.splice(i,1);drawCheckMain();focusCheckItem(Math.max(0,i-1))}
});
// Switch a note between text and checklist without losing what was written.
$('kindToggle').addEventListener('click',()=>{
 if(noteKind==='text'){
  const items=stripImageTokens($('noteBody').value).split('\n').map(l=>({done:/^\s*(?:☑|\[x\])/i.test(l),text:l.replace(/^\s*(?:[-*•]|☐|☑|\[ ?x?\])\s*/i,'').trim()})).filter(x=>x.text);
  checkItems=[...checkItems,...items];$('noteBody').value='';setNoteKind('checklist');focusCheckItem(checkItems.length?checkItems.length-1:0);
 }else{
  const text=checkItems.filter(x=>x.text.trim()).map(x=>(x.done?'☑ ':'☐ ')+x.text).join('\n');
  $('noteBody').value=[$('noteBody').value.trim(),text].filter(Boolean).join('\n');checkItems=[];drawChecklist([]);setNoteKind('text');
 }
});


if(window.MeowAndroid?.setAppLock){
 $('pinSection').hidden=true;$('appLockSection').hidden=false;
 // Someone who used the old PIN keeps a lock: switch them to the phone's lock once.
 if(safeStorage.getItem('note-pin-hash')&&!safeStorage.getItem('meow-lock-migrated')){safeStorage.setItem('meow-lock-migrated','1');try{if(window.MeowAndroid.appLockAvailable())window.MeowAndroid.setAppLock(true)}catch{}}
 try{$('appLockOn').checked=window.MeowAndroid.getAppLock()}catch{}
 $('appLockOn').addEventListener('change',e=>{
  if(e.target.checked&&!window.MeowAndroid.appLockAvailable()){e.target.checked=false;toast(nt('lockUnavailable'));return}
  window.MeowAndroid.setAppLock(e.target.checked);toast(nt(e.target.checked?'lockOn':'lockOff'));
 });
}



// ---- In-app dialogs (instead of the browser's prompt / confirm boxes) ----
function appDialog({title='',message='',input=false,value='',placeholder='',ok='',cancel='',danger=false}={}){
 return new Promise(resolve=>{
  const wrap=document.createElement('div');wrap.className='appDialog';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');
  wrap.innerHTML=`<section class="appDialogBox">${title?`<h3>${esc(title)}</h3>`:''}${message?`<p>${esc(message).replace(/\n/g,'<br>')}</p>`:''}${input?`<input type="text" maxlength="40" value="${esc(value)}" placeholder="${esc(placeholder)}" enterkeyhint="done">`:''}<div class="appDialogBtns"><button type="button" data-v="0">${esc(cancel||nt('cancel'))}</button><button type="button" data-v="1" class="${danger?'danger':'primary'}">${esc(ok||nt('ok'))}</button></div></section>`;
  document.body.appendChild(wrap);
  const field=wrap.querySelector('input');
  const answer=yes=>input?(yes?field.value:null):yes;
  const done=v=>{wrap.remove();document.removeEventListener('keydown',key,true);resolve(v)};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(answer(false))}else if(e.key==='Enter'&&field&&document.activeElement===field){e.preventDefault();done(answer(true))}};
  document.addEventListener('keydown',key,true);
  wrap.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(b)done(answer(b.dataset.v==='1'));else if(e.target===wrap)done(answer(false))});
  setTimeout(()=>(field||wrap.querySelector('[data-v="1"]')).focus(),30);
 });
}
function appConfirm(message,opts={}){return appDialog({message,...opts})}
function appPrompt(title,opts={}){return appDialog({title,input:true,...opts})}
// ---- local notes, trash clean-up, repeating reminders ----
function loadLocalNotes(){try{const l=JSON.parse(safeStorage.getItem('meow-local-notes')||'[]');return Array.isArray(l)?l:[]}catch{return []}}
function noteText(n){return n.kind==='checklist'||(!n.body&&n.checklist?.length)?(n.checklist||[]).map(x=>(x.done?'☑ ':'☐ ')+x.text).join('\n'):stripImageTokens(n.body)}
// Offer once per account to move notes written before signing in into the account.
function offerLocalImport(user){
 const local=loadLocalNotes();const key='meow-local-offered-'+user.uid;
 if(!local.length||safeStorage.getItem(key))return;
 safeStorage.setItem(key,'1');
 setTimeout(async()=>{
  if(!(await appConfirm(nt('importLocal').replace('{n}',local.length),{ok:nt('importOk')})))return;
  local.forEach(n=>{if(!n?.id)return;const {id,...data}=n;queueWrite(setDoc(doc(collection(db,'users',user.uid,'notes'),id),{...data,updatedAt:serverTimestamp()},{merge:true}))});
  safeStorage.removeItem('meow-local-notes');toast(nt('imported'));
 },600);
}
function nextOccurrence(at,repeat,now){
 const d=new Date(at);let guard=0;
 while(d.getTime()<=now&&guard++<2000){if(repeat==='daily')d.setDate(d.getDate()+1);else if(repeat==='weekly')d.setDate(d.getDate()+7);else if(repeat==='monthly')d.setMonth(d.getMonth()+1);else break}
 return d.getTime();
}
var trashPurged;
function purgeOldTrash(){
 if(!trashPurged)trashPurged=new Set(); // render() can run before this block during start-up
 const cutoff=Date.now()-30*864e5;
 const old=notes.filter(n=>n.deletedAt&&new Date(n.deletedAt).getTime()<cutoff&&!trashPurged.has(n.id));
 if(!old.length)return;
 old.forEach(n=>trashPurged.add(n.id));
 if(currentUser)old.forEach(n=>queueWrite(deleteDoc(doc(noteCollection(),n.id))));
 else setTimeout(()=>{const ids=new Set(old.map(n=>n.id));notes=notes.filter(n=>!ids.has(n.id));persistLocalNotes(notes);render()},0);
}
// ---- voice typing ----
function insertDictated(text){
 text=String(text||'').trim();if(!text)return;
 if(noteKind==='checklist'){const empty=checkItems.findIndex(x=>!String(x.text||'').trim());if(empty>=0)checkItems[empty].text=text;else checkItems.push({text,done:false});drawCheckMain();return}
 rich.focus();const sel=getSelection();sel.removeAllRanges();
 if(savedRange&&rich.contains(savedRange.startContainer))sel.addRange(savedRange);else{const r=document.createRange();r.selectNodeContents(rich);r.collapse(false);sel.addRange(r)}
 const before=sel.anchorNode?.nodeType===3?sel.anchorNode.data.slice(0,sel.anchorOffset):'';
 document.execCommand('insertText',false,(before&&!/\s$/.test(before)?' ':'')+text);
 syncBodyFromRich();
}
window.meowDictationResult=(text,err)=>{$('dictate').classList.remove('listening');if(err){if(err!=='cancelled')toast(nt('dictateFailed'));return}insertDictated(text)};
$('dictate').addEventListener('mousedown',e=>e.preventDefault()); // keep the caret in the note
$('dictate').addEventListener('click',()=>{
 const lang=language==='en'?'en-US':'th-TH';
 if(window.MeowAndroid?.startDictation){$('dictate').classList.add('listening');window.MeowAndroid.startDictation(lang);return}
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast(nt('dictateUnsupported'));return}
 const r=new SR();r.lang=lang;r.interimResults=false;r.maxAlternatives=1;$('dictate').classList.add('listening');
 r.onresult=e=>window.meowDictationResult(e.results[0][0].transcript,null);
 r.onerror=e=>window.meowDictationResult(null,e.error==='no-speech'||e.error==='aborted'?'cancelled':e.error);
 r.onend=()=>$('dictate').classList.remove('listening');
 try{r.start()}catch{$('dictate').classList.remove('listening')}
});
// ---- monthly summary ----
var summaryMonth=new Date();
function renderSummary(){
 const y=summaryMonth.getFullYear(),m=summaryMonth.getMonth();
 $('summaryHeading').textContent='📊 '+summaryMonth.toLocaleDateString(language==='th'?'th-TH':'en-US',{month:'long',year:'numeric'});
 const live=notes.filter(n=>!n.deletedAt);
 const inMonth=live.filter(n=>{const d=new Date(n.createdAt||n.updatedAt||0);return d.getFullYear()===y&&d.getMonth()===m});
 const days=new Set(live.flatMap(n=>[n.createdAt,n.updatedAt].filter(Boolean).map(t=>dayKey(new Date(t)))));
 const monthDays=[...days].filter(k=>k.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)).sort();
 let best=0,run=0,prev=null;for(const k of monthDays){const t=new Date(k+'T00:00').getTime();run=prev!==null&&t-prev<=864e5+36e5?run+1:1;best=Math.max(best,run);prev=t}
 let now=0;for(let d=new Date();days.has(dayKey(d));d.setDate(d.getDate()-1))now++;
 const items=inMonth.flatMap(n=>n.checklist||[]),done=items.filter(x=>x.done).length;
 const pics=inMonth.reduce((t,n)=>t+(n.images?.length||0),0);
 const moods={};inMonth.forEach(n=>{if(n.mood)moods[n.mood]=(moods[n.mood]||0)+1});
 const moodList=Object.entries(moods).sort((a,b)=>b[1]-a[1]),maxMood=moodList[0]?.[1]||1;
 const tile=(v,label)=>`<div class="sumTile"><b>${v}</b><span>${esc(label)}</span></div>`;
 $('summaryBody').innerHTML=!inMonth.length&&!monthDays.length?`<p class="sumEmpty">🐾 ${esc(nt('sumEmpty'))}</p>`:
  `<div class="sumGrid">${tile(inMonth.length,nt('sumNotes'))}${tile(monthDays.length,nt('sumDays'))}${tile(best+' '+nt('sumDaysUnit'),nt('sumStreak'))}${tile(now+' '+nt('sumDaysUnit'),nt('sumNow'))}${tile(items.length?done+'/'+items.length:'—',nt('sumDone'))}${tile(pics,nt('sumImages'))}</div>
  <h3 class="sumH">${esc(nt('sumMoods'))}</h3>${moodList.length?moodList.map(([mo,c])=>`<div class="sumBar"><span>${mo}</span><i style="width:${Math.max(8,c/maxMood*100)}%"></i><b>${c}</b></div>`).join(''):`<p class="sumEmpty">${esc(nt('sumNoMood'))}</p>`}`;
}
$('openSummary').addEventListener('click',()=>{summaryMonth=new Date();renderSummary();$('summaryModal').classList.add('show')});
$('summaryClose').addEventListener('click',()=>$('summaryModal').classList.remove('show'));
$('sumPrev').addEventListener('click',()=>{summaryMonth.setMonth(summaryMonth.getMonth()-1);renderSummary()});
$('sumNext').addEventListener('click',()=>{summaryMonth.setMonth(summaryMonth.getMonth()+1);renderSummary()});
// ---- weekly automatic backup (Android app) ----
function buildBackupPayload(){return {app:'Meow Diary',schemaVersion:1,exportedAt:new Date().toISOString(),notes,moods:JSON.parse(safeStorage.getItem('meow-moods')||'{}'),pet,missions:missionState(),settings:{language:safeStorage.getItem('note-language')||'th',dark:safeStorage.getItem('note-dark'),colorConfig:safeStorage.getItem('note-color-config'),noteColors:safeStorage.getItem('note-custom-note-colors')}}}
function showBackupLast(){const t=Number(safeStorage.getItem('meow-backup-last')||0);$('backupLastText').textContent=t?nt('backupLast')+new Date(t).toLocaleString(language==='th'?'th-TH':'en-US'):nt('backupNever')}
function runBackup(announce){
 if(!notes.length)return false;
 let ok=false;try{ok=!!window.MeowAndroid.saveBackup(`meow-diary-backup-${todayKey()}.json`,JSON.stringify(buildBackupPayload()))}catch{}
 if(ok){safeStorage.setItem('meow-backup-last',String(Date.now()));showBackupLast();if(announce)toast(nt('backupDone'))}
 return ok;
}
if(window.MeowAndroid?.saveBackup){
 $('autoBackupSection').hidden=false;
 const on=()=>safeStorage.getItem('meow-backup-auto')!=='0';
 $('autoBackupOn').checked=on();showBackupLast();
 $('autoBackupOn').addEventListener('change',e=>safeStorage.setItem('meow-backup-auto',e.target.checked?'1':'0'));
 $('backupNowBtn').addEventListener('click',()=>{if(!runBackup(true))toast(nt('sumEmpty'))});
 // Give cloud notes a few seconds to arrive, then back up if the last one is a week old.
 setTimeout(()=>{if(on()&&Date.now()-Number(safeStorage.getItem('meow-backup-last')||0)>7*864e5)runBackup(true)},8000);
}

// ---- Desktop: install as an app, keyboard shortcuts, ?new= shortcuts ----
let installPrompt=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;if(!window.MeowAndroid)$('installApp').hidden=false});
addEventListener('appinstalled',()=>{installPrompt=null;$('installApp').hidden=true;toast(nt('installed'))});
$('installApp').addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();try{await installPrompt.userChoice}catch{}installPrompt=null;$('installApp').hidden=true});
// Shortcuts from the installed app's icon menu (manifest "shortcuts").
{const kind=new URLSearchParams(location.search).get('new');if(kind){history.replaceState(null,'',location.pathname);setTimeout(()=>window.meowQuickAction?.(kind==='checklist'?'checklist':'text'),400)}}
document.addEventListener('keydown',e=>{
 const typing=e.target.closest?.('input,textarea,select,[contenteditable="true"]');
 const editorOpen=$('overlay').classList.contains('show');
 const mod=e.ctrlKey||e.metaKey;
 if(mod&&e.key.toLowerCase()==='s'&&editorOpen){e.preventDefault();saveNote();return}
 if(mod&&e.key.toLowerCase()==='k'){e.preventDefault();if(editorOpen)return;$('navSearch').click();return}
 if(typing||editorOpen||mod||e.altKey||document.querySelector('.appDialog,.sheetOverlay.show,.calendarModal.show'))return;
 if(e.key==='n'||e.key==='N'){e.preventDefault();window.meowQuickAction('text')}
 else if(e.key==='l'||e.key==='L'){e.preventDefault();window.meowQuickAction('checklist')}
 else if(e.key==='/'){e.preventDefault();$('navSearch').click()}
});

// ---- App updates from Google Play (Android app) ----
window.meowUpdateInfo=info=>{
 if(info?.available){$('updateBanner').hidden=false;if(info.manual)toast(nt('updateAvailable'));return}
 if(!info?.manual)return;
 if(info.reason==='notPlay')appConfirm(nt('updateNotPlay'),{ok:nt('openDownload')}).then(ok=>{if(ok)window.MeowAndroid?.openExternal('https://likewacom-web.github.io/Meow-Diary/download/')});
 else toast(nt(info.reason==='error'?'updateError':'updateNone'));
};
$('updateNow').addEventListener('click',()=>{$('updateBanner').hidden=true;window.MeowAndroid?.startUpdate()});
$('updateLater').addEventListener('click',()=>$('updateBanner').hidden=true);
if(window.MeowAndroid?.appVersion){
 try{$('appVersionText').textContent=nt('version')+' '+window.MeowAndroid.appVersion();$('appVersionText').hidden=false}catch{}
 $('checkUpdate').hidden=false;
 $('checkUpdate').addEventListener('click',()=>{toast(nt('updateChecking'));window.MeowAndroid.checkForUpdate()});
}
// ---- Share a note to other apps ----
function noteShareText(){
 const title=$('noteTitle').value.trim();
 const body=noteKind==='checklist'?checkItems.filter(x=>String(x.text||'').trim()).map(x=>(x.done?'☑ ':'☐ ')+x.text).join('\n'):stripImageTokens($('noteBody').value);
 return {title,text:[title,body].filter(Boolean).join('\n\n')};
}
$('shareNote').addEventListener('click',async()=>{
 const {title,text}=noteShareText();if(!text){toast(tr('enterText'));return}
 if(window.MeowAndroid?.shareText){window.MeowAndroid.shareText(title,text);return}
 if(navigator.share){try{await navigator.share({title,text})}catch{}return}
 try{await navigator.clipboard.writeText(text);toast(nt('copied'))}catch{toast(text.slice(0,120))}
});
// ---- App shortcuts (long-press the app icon) ----
window.meowQuickAction=kind=>{
 showTab('notes');document.querySelectorAll('.sheetOverlay.show').forEach(o=>closeSheet(o.id));
 if(kind==='checklist'){nextNoteKind='checklist';openEditor();setTimeout(()=>focusCheckItem(0),150)}else openEditor();
};
// ---- Delete account and all data (required for Play Store) ----
async function reauthForDelete(){
 if(window.MeowAndroid){
  const token=await new Promise((resolve,reject)=>{nativeSignInWaiter={resolve,reject};window.MeowAndroid.signInWithGoogle()});
  await reauthenticateWithCredential(auth.currentUser,GoogleAuthProvider.credential(token));
 }else await reauthenticateWithPopup(auth.currentUser,new GoogleAuthProvider());
}
$('deleteAccount').addEventListener('click',async()=>{
 const signedIn=!!currentUser;
 if(!(await appConfirm(nt(signedIn?'deleteConfirm1':'deleteConfirmLocal'),{danger:true,ok:nt('deleteOk')}))||!(await appConfirm(nt('deleteConfirm2'),{danger:true,ok:nt('deleteOk')})))return;
 const btn=$('deleteAccount');btn.disabled=true;
 try{
  if(signedIn){
   if(!navigator.onLine){toast(nt('deleteOffline'));return}
   toast(nt('deleting'));
   const uid=currentUser.uid;
   for(const name of ['notes','dailyMoods']){const snap=await getDocs(collection(db,'users',uid,name));await Promise.all(snap.docs.map(d=>deleteDoc(d.ref)))}
   try{await deleteUser(auth.currentUser)}catch(e){if(e.code!=='auth/requires-recent-login')throw e;await reauthForDelete();await deleteUser(auth.currentUser)}
   try{window.MeowAndroid?.signOut()}catch{}
  }
  try{window.MeowAndroid?.scheduleReminders('[]');window.MeowAndroid?.setDailyReminder(false,20,0);window.MeowAndroid?.setAppLock(false)}catch{}
  safeStorage.clear();try{sessionStorage.clear()}catch{}
  toast(nt('deleted'));setTimeout(()=>location.reload(),900);
 }catch(e){if(e.message!=='cancelled')toast(nt('deleteFailed')+e.message)}
 finally{btn.disabled=false}
});
// ---- Android app: reminders that fire when the app is closed, share-to-app ----
// var: render() may run before this block during start-up.
var lastNativeSchedule='',pendingOpenNoteId=null,nativeScheduleTimer=null;
function afterNotesChanged(){
 purgeOldTrash();
 if(pendingOpenNoteId){const n=notes.find(x=>x.id===pendingOpenNoteId);if(n){pendingOpenNoteId=null;setTimeout(()=>openEditor(n),0)}}
 if(!window.MeowAndroid?.scheduleReminders)return;
 clearTimeout(nativeScheduleTimer);
 nativeScheduleTimer=setTimeout(()=>{
  const now=Date.now();
  const list=notes.filter(n=>n.reminderAt&&!n.deletedAt).map(n=>{let at=new Date(n.reminderAt).getTime();if(n.reminderRepeat&&at<=now)at=nextOccurrence(at,n.reminderRepeat,now);
   return {id:n.id,title:n.title||'',body:noteText(n).slice(0,240),at,repeat:n.reminderRepeat||''}}).filter(x=>x.at>now);
  const json=JSON.stringify(list);
  if(json!==lastNativeSchedule){lastNativeSchedule=json;try{window.MeowAndroid.scheduleReminders(json)}catch{}}
 },400);
}
// Tapping a reminder notification opens that note.
window.meowOpenNote=id=>{showTab('notes');const n=notes.find(x=>x.id===id);if(n)openEditor(n);else pendingOpenNoteId=id};
// Text / pictures shared from another app become a new note.
window.meowSharedContent=async data=>{
 showTab('notes');document.querySelectorAll('.sheetOverlay.show').forEach(o=>closeSheet(o.id));
 openEditor();
 if(data?.title)$('noteTitle').value=String(data.title).slice(0,120);
 if(data?.text)$('noteBody').value=String(data.text);
 const files=[];
 for(const [i,url] of (data?.images||[]).entries()){try{const blob=await (await fetch(url)).blob();files.push(new File([blob],`shared-${i+1}.jpg`,{type:blob.type||'image/jpeg'}))}catch{}}
 if(files.length)await addImageFiles(files);
 toast(nt('sharedIn'));
};
if(window.MeowAndroid?.setDailyReminder){
 $('dailyReminderSection').hidden=false;
 let cfg={on:false,time:'20:00'};try{cfg={...cfg,...JSON.parse(safeStorage.getItem('meow-daily-reminder')||'{}')}}catch{}
 $('dailyReminderOn').checked=!!cfg.on;$('dailyReminderTime').value=cfg.time;
 const applyDaily=announce=>{
  const on=$('dailyReminderOn').checked,time=$('dailyReminderTime').value||'20:00',[h,m]=time.split(':').map(Number);
  safeStorage.setItem('meow-daily-reminder',JSON.stringify({on,time}));
  if(on)try{window.MeowAndroid.requestNotificationPermission()}catch{}
  try{window.MeowAndroid.setDailyReminder(on,h||0,m||0)}catch{}
  if(announce)toast(on?nt('dailySaved')+time:nt('dailyOff'));
 };
 $('dailyReminderOn').addEventListener('change',()=>applyDaily(true));
 $('dailyReminderTime').addEventListener('change',()=>{if($('dailyReminderOn').checked)applyDaily(true)});
 applyDaily(false);
}
// Ask for notification permission as soon as a reminder time is picked in the app.
$('noteReminder').addEventListener('change',()=>{if($('noteReminder').value)try{window.MeowAndroid?.requestNotificationPermission()}catch{}});

// ---- Images inside the note text ----
// The body text stays plain: each image sits on its own line as [[img:id]],
// and the editor shows those lines as pictures that can be moved up/down.
// A Firestore document is capped at 1 MiB, so keep each note's images under budget.
const IMAGE_BUDGET=780000;
const IMG_LINE=/^\[\[img:([\w-]+)\]\]$/;
function stripImageTokens(t,repl=''){t=String(t||'');return (repl?t.replace(/\[\[img:[\w-]+\]\]/g,repl):t.replace(/^\[\[img:[\w-]+\]\]$\n?/gm,'')).trim()}
function bodyToHtml(n){const byId=new Map((n.images||[]).map(im=>[im.id,im]));return String(n.body||'').split('\n').map(l=>{const m=l.match(IMG_LINE);return m&&byId.has(m[1])?`<img src="${esc(imgUrl(byId.get(m[1]).src))}" style="width:${imgPct(byId.get(m[1]))}%;max-width:100%;${byId.get(m[1]).sticker?'':'border-radius:8px;'}${imgAlign(byId.get(m[1]))==='Left'?'float:left;margin:4px 14px 8px 0':imgAlign(byId.get(m[1]))==='Right'?'float:right;margin:4px 0 8px 14px':'margin:6px 0;display:block'}">`:esc(l)}).join('\n')}
function imgUrl(src){return /^stickers\/[\w-]+\.png$/.test(src)?new URL(src,location.href).href:src}
function persistLocalNotes(list){
 const json=JSON.stringify(list);
 try{localStorage.setItem('meow-local-notes',json);return localStorage.getItem('meow-local-notes').length===json.length}
 catch{return false}
}
function loadImageFile(file){
 return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const img=new Image();
  img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('image'))};img.src=url});
}
function encodeImage(img,maxEdge,quality){
 const scale=Math.min(1,maxEdge/Math.max(img.naturalWidth,img.naturalHeight));
 const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
 const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
 return {id:Math.random().toString(36).slice(2,10),src:c.toDataURL('image/jpeg',quality),w,h};
}
const rich=$('noteRich'),bodyEl=$('noteBody');
const taValue=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
let syncingRich=false,savedRange=null;
// Code elsewhere (templates, AI) writes noteBody.value; mirror those writes into the editor.
Object.defineProperty(bodyEl,'value',{configurable:true,get(){return taValue.get.call(bodyEl)},set(v){taValue.set.call(bodyEl,v);if(!syncingRich)renderRich()}});
function figureHtml(im){const pct=imgPct(im),al=imgAlign(im);return `<figure class="inlineImg${im.sticker?' sticker':''}${pct<55?' small':''}${al?' align'+al:''}" contenteditable="false" data-img="${esc(im.id)}" style="width:${pct}%"><img src="${esc(im.src)}" alt=""><span class="imgResize" data-imgresize aria-label="ลากเพื่อย่อหรือขยายรูป" title="ลากเพื่อย่อ/ขยาย"></span><span class="imgTools"><button type="button" data-imgalign aria-label="วางข้อความข้างรูป" title="ข้อความข้างรูป">⇆</button><button type="button" data-imgsize aria-label="เปลี่ยนขนาดรูป" title="ขนาด">⤡</button><button type="button" data-imgup aria-label="ย้ายขึ้น">↑</button><button type="button" data-imgdown aria-label="ย้ายลง">↓</button><button type="button" data-imgremove aria-label="ลบรูป">×</button></span></figure>`}
function renderRich(){
 noteImages.forEach(im=>{if(!im.id)im.id=Math.random().toString(36).slice(2,10)});
 const text=taValue.get.call(bodyEl),byId=new Map(noteImages.map(im=>[im.id,im])),used=new Set();
 let html='';
 if(text)for(const line of text.split('\n')){const m=line.match(IMG_LINE);if(m&&byId.has(m[1])&&!used.has(m[1])){used.add(m[1]);html+=figureHtml(byId.get(m[1]))}else html+=`<div>${line?esc(line):'<br>'}</div>`}
 // Images saved before inline placement existed go at the end.
 for(const im of noteImages)if(!used.has(im.id))html+=figureHtml(im)+'<div><br></div>';
 rich.innerHTML=html;rich.dataset.placeholder=bodyEl.placeholder||'';
 if(noteImages.some(im=>!used.has(im.id)))syncBodyFromRich();
}
function inlineText(n){
 if(n.nodeType===3)return n.data;if(n.nodeName==='BR')return '\n';
 if(n.nodeName==='FIGURE')return n.dataset.img?`\n[[img:${n.dataset.img}]]\n`:'';
 let t='';for(const c of n.childNodes)t+=inlineText(c);
 if(/^(DIV|P|LI|H[1-6])$/.test(n.nodeName)&&t&&!t.endsWith('\n'))t+='\n';return t;
}
function serializeRich(){
 const lines=[];let cur=null;const flush=()=>{if(cur!==null){lines.push(cur);cur=null}};
 for(const n of rich.childNodes){
  if(n.nodeName==='FIGURE'){flush();if(n.dataset.img)lines.push(`[[img:${n.dataset.img}]]`);continue}
  if(n.nodeType===3){cur=(cur??'')+n.data;continue}
  if(n.nodeName==='BR'){cur=cur??'';flush();continue}
  flush();let t=inlineText(n);if(t.endsWith('\n'))t=t.slice(0,-1);lines.push(...t.split('\n'));
 }
 flush();return lines.join('\n').replace(/\s+$/,'');
}
function syncBodyFromRich(){syncingRich=true;bodyEl.value=serializeRich();syncingRich=false}
function usedNoteImages(){const body=taValue.get.call(bodyEl);return noteImages.filter(im=>body.includes(`[[img:${im.id}]]`))}
function drawNoteImages(){renderRich()}
const imagesSize=()=>usedNoteImages().reduce((t,im)=>t+im.src.length,0)+(drawingData||'').length;
function placeCaretIn(el,move){const r=document.createRange();r.setStart(el,0);r.collapse(true);savedRange=r;if(move){const sel=getSelection();sel.removeAllRanges();sel.addRange(r)}}
function insertFigure(im){
 const holder=document.createElement('div');holder.innerHTML=figureHtml(im);const fig=holder.firstChild;
 let block=null;const hadCaret=!!(savedRange&&rich.contains(savedRange.startContainer));
 if(hadCaret){
  block=savedRange.startContainer;
  if(block===rich)block=rich.childNodes[savedRange.startOffset-1]||null;
  else while(block&&block.parentNode!==rich)block=block.parentNode;
 }
 if(block)block.after(fig);else rich.append(fig);
 let next=fig.nextSibling;
 if(!next||next.nodeName!=='DIV'||next.textContent){next=document.createElement('div');next.innerHTML='<br>';fig.after(next)}
 placeCaretIn(next,hadCaret);syncBodyFromRich();
}
async function addImageFiles(files){
 files=[...files].filter(f=>f.type.startsWith('image/'));if(!files.length)return;
 $('imageStatus').textContent=nt('imageWorking');
 // Smaller images when notes live only in this browser's storage.
 const steps=currentUser?[[1280,.75],[1024,.68],[800,.6],[640,.55]]:[[900,.66],[720,.6],[560,.55]];
 for(const file of files){
  let img;try{img=await loadImageFile(file)}catch{toast(nt('imageFailed'));continue}
  let added=null;
  for(const [edge,q] of steps){const enc=encodeImage(img,edge,q);if(imagesSize()+enc.src.length<=IMAGE_BUDGET){added=enc;break}}
  if(!added){toast(nt('imageTooBig'));break}
  noteImages.push(added);insertFigure(added);
 }
 $('imageStatus').textContent='';
}
function openImageViewer(src){$('imgViewerImg').src=src;$('imgViewer').classList.add('show')}
document.addEventListener('selectionchange',()=>{const sel=getSelection();if(sel.rangeCount&&rich.contains(sel.anchorNode))savedRange=sel.getRangeAt(0).cloneRange()});
rich.addEventListener('input',syncBodyFromRich);
// Keep the caret where it was when the image buttons are pressed.
rich.addEventListener('mousedown',e=>{if(e.target.closest('.imgTools'))e.preventDefault()});
rich.addEventListener('click',e=>{
 const fig=e.target.closest('figure.inlineImg');if(!fig)return;
 const sib=(n,dir)=>{n=n[dir];while(n&&n.nodeType===3&&!n.data.trim())n=n[dir];return n};
 if(e.target.closest('[data-imgresize]'))return;
 if(e.target.closest('[data-imgalign]')){const im=imageOf(fig),a=imgAlign(im);setImgAlign(fig,a===''?'Left':a==='Left'?'Right':'');return}
 if(e.target.closest('[data-imgsize]')){const pct=imgPct(imageOf(fig));setImgPct(fig,pct>85?66:pct>55?40:100);return}
 if(e.target.closest('[data-imgremove]')){const next=fig.nextSibling;fig.remove();if(next&&next.nodeName==='DIV'&&!next.textContent&&next.previousSibling?.nodeName==='DIV'&&!next.previousSibling.textContent)next.remove();syncBodyFromRich();return}
 if(e.target.closest('[data-imgup]')){const prev=sib(fig,'previousSibling');if(prev){prev.before(fig);syncBodyFromRich()}return}
 if(e.target.closest('[data-imgdown]')){const next=sib(fig,'nextSibling');if(next){next.after(fig);syncBodyFromRich()}return}
 if(!e.target.closest('.imgTools')&&!imgDrag.justDropped)openImageViewer(fig.querySelector('img').src);
});
// Paste images as pictures and everything else as plain text.
rich.addEventListener('paste',e=>{
 const files=[...(e.clipboardData?.files||[])].filter(f=>f.type.startsWith('image/'));
 e.preventDefault();
 if(files.length){addImageFiles(files);return}
 const text=e.clipboardData?.getData('text/plain')||'';if(text)document.execCommand('insertText',false,text);
});
$('addImage').addEventListener('click',()=>$('imagePick').click());
$('takePhoto').addEventListener('click',()=>$('cameraPick').click());
for(const id of ['imagePick','cameraPick'])$(id).addEventListener('change',async e=>{await addImageFiles(e.target.files||[]);e.target.value=''});
$('imgViewer').addEventListener('click',()=>$('imgViewer').classList.remove('show'));

// ---- LINE-style cat stickers: small transparent pictures shipped with the app ----
// A sticker is stored like any picture but points at stickers/<name>.png instead of
// holding image data, so it costs almost nothing in the note.
const CAT_STICKERS=[['hello','สวัสดี','Hello'],['thanks','ขอบคุณ','Thanks'],['love','รักนะ','Love you'],['goodnight','ฝันดี','Good night'],['ok','โอเค','OK'],['hungry','หิวแล้ว','Hungry'],['tired','เหนื่อย','Tired'],['cry','ร้องไห้','Crying'],['angry','โกรธแล้ว','Angry'],['wow','ว้าว!','Wow'],['fight','สู้ๆ','You got this'],['confused','งงอะ','Confused'],['lol','555+','LOL'],['sorry','ขอโทษน้า','Sorry'],['yay','เย้!','Yay'],['miss','คิดถึงนะ','Miss you']];
$('catStickerList').innerHTML=CAT_STICKERS.map(([k,th,en])=>`<button type="button" data-catsticker="${k}" aria-label="${th} / ${en}" title="${th}"><img src="stickers/${k}.png" alt="${th}" loading="lazy"></button>`).join('');
$('addCatSticker').addEventListener('click',()=>openSheet('catStickerSheet'));
$('catStickerSheet').addEventListener('click',e=>{
 const b=e.target.closest('[data-catsticker]');if(!b)return;closeSheet('catStickerSheet');
 const im={id:Math.random().toString(36).slice(2,10),src:`stickers/${b.dataset.catsticker}.png`,w:240,h:260,pct:40,sticker:true};
 noteImages.push(im);insertFigure(im);
});


// ---- Resize pictures in a note: drag the corner handle, or ⤡ to cycle full / medium / small ----
function imgPct(im){const v=Number(im?.pct);return v>=20&&v<=100?Math.round(v):100}
function imgAlign(im){return im?.align==='Left'||im?.align==='Right'?im.align:''}
// Float a picture left or right so the following lines of text sit beside it.
function setImgAlign(fig,align){
 const im=imageOf(fig);if(im)im.align=align;
 fig.classList.toggle('alignLeft',align==='Left');fig.classList.toggle('alignRight',align==='Right');
 if(align&&imgPct(im)>60)setImgPct(fig,45);
 if(align){let next=fig.nextSibling;if(!next||next.nodeName!=='DIV'){const d=document.createElement('div');d.innerHTML='<br>';fig.after(d);next=d}placeCaretIn(next,true)}
 toast(nt(align?'imgTextBeside':'imgFullLine'));
}
function imageOf(fig){return noteImages.find(im=>im.id===fig?.dataset.img)}
function setImgPct(fig,pct){
 pct=Math.max(20,Math.min(100,Math.round(pct)));const im=imageOf(fig);if(im)im.pct=pct;
 fig.style.width=pct+'%';fig.classList.toggle('small',pct<55);
}
const imgResize={fig:null,startX:0,startW:0,boxW:1};
rich.addEventListener('pointerdown',e=>{
 const h=e.target.closest('[data-imgresize]');if(!h)return;
 e.preventDefault();e.stopPropagation();
 const fig=h.closest('figure.inlineImg');
 Object.assign(imgResize,{fig,startX:e.clientX,startW:fig.getBoundingClientRect().width,boxW:rich.clientWidth||1});
 fig.classList.add('resizing');try{h.setPointerCapture(e.pointerId)}catch{}
});
rich.addEventListener('pointermove',e=>{
 if(!imgResize.fig)return;e.preventDefault();
 setImgPct(imgResize.fig,(imgResize.startW+(e.clientX-imgResize.startX))/imgResize.boxW*100);
});
const endImgResize=()=>{if(!imgResize.fig)return;imgResize.fig.classList.remove('resizing');imgResize.fig=null};
rich.addEventListener('pointerup',endImgResize);rich.addEventListener('pointercancel',endImgResize);
// Long-press an image, then drag it to a new place in the text.
const imgDrag={timer:null,fig:null,active:false,startX:0,startY:0,y:0,target:null,after:false,scroller:null,raf:0,justDropped:false};
function scrollParent(el){for(let n=el.parentElement;n;n=n.parentElement){const o=getComputedStyle(n).overflowY;if((o==='auto'||o==='scroll')&&n.scrollHeight>n.clientHeight)return n}return document.scrollingElement}
function dropSpot(y){
 const blocks=[...rich.childNodes].filter(n=>n!==imgDrag.fig&&(n.nodeType===1||n.data?.trim()));
 for(const b of blocks){const r=(b.nodeType===1?b:(()=>{const rg=document.createRange();rg.selectNode(b);return rg})()).getBoundingClientRect();if(y<r.top+r.height/2)return {target:b,after:false}}
 return blocks.length?{target:blocks[blocks.length-1],after:true}:{target:null,after:true};
}
function showDropLine(){
 const line=$('imgDropLine'),spot=dropSpot(imgDrag.y);imgDrag.target=spot.target;imgDrag.after=spot.after;
 const box=rich.getBoundingClientRect();let top;
 if(!spot.target)top=box.top+8;else{const r=(spot.target.nodeType===1?spot.target:(()=>{const rg=document.createRange();rg.selectNode(spot.target);return rg})()).getBoundingClientRect();top=spot.after?r.bottom:r.top}
 line.style.cssText=`display:block;top:${top-2}px;left:${box.left+10}px;width:${box.width-20}px`;
}
function dragLoop(){
 if(!imgDrag.active)return;
 // Auto-scroll when the finger is near the top or bottom edge.
 const sc=imgDrag.scroller,edge=70,vh=innerHeight;
 if(sc){if(imgDrag.y<edge)sc.scrollTop-=12;else if(imgDrag.y>vh-edge)sc.scrollTop+=12}
 showDropLine();imgDrag.raf=requestAnimationFrame(dragLoop);
}
function cancelPress(){clearTimeout(imgDrag.timer);imgDrag.timer=null;if(!imgDrag.active)imgDrag.fig=null}
function startImgDrag(){
 imgDrag.active=true;imgDrag.scroller=scrollParent(rich);imgDrag.fig.classList.add('dragging');document.body.classList.add('imgDragging');
 try{navigator.vibrate?.(30)}catch{}
 dragLoop();
}
function endImgDrag(drop){
 cancelAnimationFrame(imgDrag.raf);$('imgDropLine').style.display='none';document.body.classList.remove('imgDragging');
 const fig=imgDrag.fig;if(fig){fig.classList.remove('dragging');
  if(drop){const t=imgDrag.target;if(t){imgDrag.after?t.after(fig):t.before(fig)}else rich.append(fig);
   if(!fig.nextSibling||fig.nextSibling.nodeName==='FIGURE'){const d=document.createElement('div');d.innerHTML='<br>';fig.after(d)}
   syncBodyFromRich();imgDrag.justDropped=true;setTimeout(()=>imgDrag.justDropped=false,350)}}
 imgDrag.active=false;imgDrag.fig=null;
}
rich.addEventListener('pointerdown',e=>{
 const fig=e.target.closest('figure.inlineImg');if(!fig||e.target.closest('.imgTools,.imgResize')||(e.pointerType==='mouse'&&e.button!==0))return;
 imgDrag.fig=fig;imgDrag.startX=e.clientX;imgDrag.startY=imgDrag.y=e.clientY;
 imgDrag.timer=setTimeout(startImgDrag,420);
});
addEventListener('pointermove',e=>{
 if(imgDrag.active){imgDrag.y=e.clientY;e.preventDefault();return}
 if(imgDrag.timer&&Math.hypot(e.clientX-imgDrag.startX,e.clientY-imgDrag.startY)>10)cancelPress();
},{passive:false});
// While dragging, stop the page from scrolling under the finger.
addEventListener('touchmove',e=>{if(imgDrag.active)e.preventDefault()},{passive:false});
addEventListener('pointerup',()=>{if(imgDrag.active)endImgDrag(true);else cancelPress()});
addEventListener('pointercancel',()=>{if(imgDrag.active)endImgDrag(false);else cancelPress()});
document.addEventListener('contextmenu',e=>{if(e.target.closest?.('figure.inlineImg')||imgDrag.fig)e.preventDefault()},true);
rich.addEventListener('dragstart',e=>{if(e.target.closest('figure.inlineImg'))e.preventDefault()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('imgViewer').classList.remove('show')});
$('close').addEventListener('click',closeEditor);$('save').addEventListener('click',saveNote);$('saveBottom').addEventListener('click',saveNote);$('search').addEventListener('input',render);
$('delete').addEventListener('click',async()=>{if(!editingId)return;if(!currentUser){notes=notes.map(n=>n.id===editingId?{...n,deletedAt:new Date().toISOString(),updatedAt:Date.now()}:n);safeStorage.setItem('meow-local-notes',JSON.stringify(notes));render();closeEditor();toast('ย้ายโน้ตไปถังขยะแล้ว');return}queueWrite(setDoc(doc(noteCollection(),editingId),{deletedAt:new Date().toISOString(),updatedAt:serverTimestamp()}, {merge:true}),e=>'ลบไม่สำเร็จ: '+e.message);closeEditor();toast('ย้ายโน้ตไปถังขยะแล้ว')});
document.querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===b));render()}));
$('colors').addEventListener('click',e=>{const b=e.target.closest('[data-color]');if(!b)return;selectedColor=Number(b.dataset.color);document.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('selected',x===b))});
$('notes').addEventListener('click',async e=>{const pin=e.target.closest('[data-pin]');if(pin){e.stopPropagation();const n=notes.find(x=>x.id===pin.dataset.pin);if(n&&!currentUser){n.pinned=!n.pinned;n.updatedAt=Date.now();safeStorage.setItem('meow-local-notes',JSON.stringify(notes));render()}else if(n&&currentUser)queueWrite(setDoc(doc(noteCollection(),n.id),{pinned:!n.pinned,updatedAt:serverTimestamp()},{merge:true}));return}const del=e.target.closest('[data-delete]');if(del){e.stopPropagation();setNoteTrashed(del.dataset.delete,true);toastAction(nt('movedToTrash'),nt('undo'),()=>setNoteTrashed(del.dataset.delete,false));return}
const restore=e.target.closest('[data-restore]');if(restore){e.stopPropagation();if(!currentUser){notes=notes.map(n=>n.id===restore.dataset.restore?{...n,deletedAt:null,updatedAt:Date.now()}:n);safeStorage.setItem('meow-local-notes',JSON.stringify(notes));render();toast('กู้คืนโน้ตแล้ว')}else{queueWrite(setDoc(doc(noteCollection(),restore.dataset.restore),{deletedAt:null,updatedAt:serverTimestamp()},{merge:true}));toast('กู้คืนโน้ตแล้ว')}return}
const purge=e.target.closest('[data-purge]');if(purge){e.stopPropagation();if(await appConfirm(nt('purgeConfirm'),{danger:true,ok:nt('purgeOk')})){if(!currentUser){notes=notes.filter(n=>n.id!==purge.dataset.purge);safeStorage.setItem('meow-local-notes',JSON.stringify(notes));render();toast('ลบถาวรแล้ว')}else{queueWrite(deleteDoc(doc(noteCollection(),purge.dataset.purge)));toast('ลบถาวรแล้ว')}}return}
const cr=e.target.closest('[data-checkdone]');if(cr){checkItems[Number(cr.dataset.checkdone)].done=cr.checked;return}
const ct=e.target.closest('[data-checktext]');if(ct){checkItems[Number(ct.dataset.checktext)].text=ct.value;return}
const rem=e.target.closest('[data-checkremove]');if(rem){checkItems.splice(Number(rem.dataset.checkremove),1);drawChecklist(checkItems);return}
const ar=e.target.closest('[data-attachremove]');if(ar){existingAttachments.splice(Number(ar.dataset.attachremove),1);drawAttachments();return}
const card=e.target.closest('[data-open]');if(card){const n=notes.find(x=>x.id===card.dataset.open);if(n&&!n.deletedAt)openEditor(n)}});
$('notes').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-open]')){e.preventDefault();const n=notes.find(x=>x.id===e.target.dataset.open);if(n)openEditor(n)}});
$('overlay').addEventListener('click',e=>{if(e.target===$('overlay'))closeEditor()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeEditor();if((e.ctrlKey||e.metaKey)&&e.key==='Enter')saveNote()});

$('noteReminder').addEventListener('focus',async()=>{if('Notification'in window&&Notification.permission==='default')await Notification.requestPermission()});
$('checkAdd').addEventListener('click',()=>{const v=$('checkNew').value.trim();if(!v)return;checkItems.push({text:v,done:false});$('checkNew').value='';drawChecklist(checkItems)});
$('checklistBox').addEventListener('change',e=>{const b=e.target.closest('[data-checkdone]');if(b){checkItems[Number(b.dataset.checkdone)].done=b.checked}});
$('checklistBox').addEventListener('input',e=>{const b=e.target.closest('[data-checktext]');if(b)checkItems[Number(b.dataset.checktext)].text=b.value});
$('categoryFilter').addEventListener('change',render);
$('newCategory').addEventListener('click',async()=>{const name=await appPrompt(nt('newCategory'),{placeholder:nt('newCategoryHint')});if(!name?.trim())return;const val=name.trim();if(![...$('categoryFilter').options].some(o=>o.value===val)){const a=new Option(val,val);$('categoryFilter').add(a);const b=new Option(val,val);$('noteCategory').add(b)}$('categoryFilter').value=val;render()});
$('themeToggle').addEventListener('click',()=>{window.meowThemeAutoOff?.();const dark=!document.body.classList.contains('dark');document.body.classList.toggle('dark',dark);safeStorage.setItem('note-dark',dark?'1':'0');$('themeToggle').textContent=dark?'☀️ ธีมสว่าง':'🌙 ธีมมืด';const cfg=JSON.parse(safeStorage.getItem('note-color-config')||'null')||colorPresets.lavender;const next={...cfg,bg:dark?'#211f29':'#fdf9ff',accent:dark?'#b8a5f2':cfg.accent,ink:dark?'#f2edf7':colorPresets.lavender.ink,notes:dark?colorPresets.night.notes:(cfg.notes||[]).every(c=>!isDarkHex(c))?cfg.notes:colorPresets.lavender.notes};applyColorConfig(next,true)});
if(safeStorage.getItem('note-dark')==='1'){document.body.classList.add('dark');$('themeToggle').textContent='☀️ ธีมสว่าง'}
$('exportTxt').addEventListener('click',()=>{const rows=notes.filter(n=>!n.deletedAt).map(n=>`${n.title||'ไม่มีชื่อ'}\n${n.category?'หมวดหมู่: '+n.category+'\n':''}${stripImageTokens(n.body,'[รูป]')}\n${(n.checklist||[]).map(x=>`${x.done?'[x]':'[ ]'} ${x.text}`).join('\n')}\n`).join('\n---\n\n');downloadText(rows,'note-export.txt','text/plain;charset=utf-8')});
$('exportPdf').addEventListener('click',()=>{const printable=notes.filter(n=>!n.deletedAt);const html=(`<html><head><title>เหมียวไดอารี่ — ส่งออก</title><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;padding:28px;color:#302b37}article{display:flow-root;break-inside:avoid;border-bottom:1px solid #ddd;padding:12px 0}h1{font-size:24px}h2{font-size:18px}pre{white-space:pre-wrap;font:inherit}</style></head><body><h1>เหมียวไดอารี่ — ส่งออก</h1>${printable.map(n=>`<article><h2>${esc(n.title||'ไม่มีชื่อ')}</h2><p>${esc(n.category||'')}</p><pre>${bodyToHtml(n)}</pre>${(n.checklist||[]).map(x=>`<p>${x.done?'☑':'☐'} ${esc(x.text)}</p>`).join('')}</article>`).join('')}<script>window.onload=()=>window.print()<\/script></body></html>`);if(window.MeowAndroid){window.MeowAndroid.printHtml(html);return}const w=window.open('','_blank');if(!w){toast('อนุญาตป๊อปอัปเพื่อส่งออก PDF');return}w.document.write(html);w.document.close()});
function downloadText(content,name,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}
$('aiSummary').addEventListener('click',()=>{const text=stripImageTokens($('noteBody').value);if(!text){$('aiResult').textContent='เพิ่มเนื้อหาโน้ตก่อน';return}const sentences=text.split(/(?<=[.!?。！？\n])\s+/).filter(Boolean);const summary=sentences.length>3?sentences.slice(0,3).join(' '):text;$('aiResult').textContent='สรุป: '+summary;});

const moods=[['😊','มีความสุข'],['😌','สงบ'],['😐','เฉย ๆ'],['😔','เศร้า'],['😤','เครียด'],['🤩','ตื่นเต้น'],['🥰','อบอุ่น'],['😴','เหนื่อย']];let todayMood='';
$('moodChoices').innerHTML=moods.map(([e,t])=>`<button class="moodChoice" data-mood="${e}">${e}<br><small>${t}</small></button>`).join('');
function dayKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
$('openMood').onclick=()=>{const data=JSON.parse(safeStorage.getItem('meow-moods')||'{}');$('moodModal').classList.add('show');todayMood=data[dayKey()]?.mood||'';$('moodText').value=data[dayKey()]?.text||'';$('moodHistory').textContent=`บันทึกอารมณ์แล้ว ${Object.keys(data).length} วัน`;document.querySelectorAll('.moodChoice').forEach(b=>b.classList.toggle('active',b.dataset.mood===todayMood))};
$('moodChoices').onclick=e=>{const b=e.target.closest('[data-mood]');if(!b)return;todayMood=b.dataset.mood;document.querySelectorAll('.moodChoice').forEach(x=>x.classList.toggle('active',x===b))};
$('moodClose').onclick=()=>$('moodModal').classList.remove('show');
$('moodSave').onclick=async()=>{const data=JSON.parse(safeStorage.getItem('meow-moods')||'{}');data[dayKey()]={mood:todayMood,text:$('moodText').value,updatedAt:Date.now()};safeStorage.setItem('meow-moods',JSON.stringify(data));if(typeof renderPet==='function')renderPet();if(currentUser)queueWrite(setDoc(doc(db,'users',currentUser.uid,'dailyMoods',dayKey()),{...data[dayKey()],date:dayKey(),updatedAt:serverTimestamp()},{merge:true}),()=>'บันทึกในเครื่องแล้ว แต่ซิงก์ไม่สำเร็จ');$('moodModal').classList.remove('show');toast('บันทึกอารมณ์แล้ว')};
function renderCalendar(){const y=calendarDate.getFullYear(),m=calendarDate.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();$('calMonth').textContent=calendarDate.toLocaleDateString(language==='th'?'th-TH':'en-US',{month:'long',year:'numeric'});const has={},moodOf={};let daily={};try{daily=JSON.parse(safeStorage.getItem('meow-moods')||'{}')}catch{}for(const [k,v] of Object.entries(daily))if(v?.mood)moodOf[k]=v.mood;notes.filter(n=>!n.deletedAt).sort((a,b)=>(a.updatedAt||0)-(b.updatedAt||0)).forEach(n=>{const k=dayKey(new Date(n.updatedAt||Date.now()));has[k]=(has[k]||0)+1;if(n.mood)moodOf[k]=n.mood});let out='';for(let i=0;i<first;i++)out+='<span></span>';for(let d=1;d<=days;d++){const k=dayKey(new Date(y,m,d));out+=`<button class="${has[k]?'hasNotes':''}" data-calday="${k}">${d}${moodOf[k]?`<span class="calMood">${moodOf[k]}</span>`:has[k]?' •':''}</button>`}$('calendarGrid').innerHTML=out;$('calendarResults').textContent='เลือกวันที่เพื่อดูโน้ต'};
$('openCalendar').onclick=()=>{$('calendarModal').classList.add('show');renderCalendar()};$('calendarClose').onclick=()=>$('calendarModal').classList.remove('show');$('calPrev').onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()-1);renderCalendar()};$('calNext').onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()+1);renderCalendar()};
$('calendarGrid').onclick=e=>{const b=e.target.closest('[data-calday]');if(!b)return;const k=b.dataset.calday,found=notes.filter(n=>!n.deletedAt&&dayKey(new Date(n.updatedAt||Date.now()))===k);$('calendarResults').innerHTML=`<strong>${k}</strong><div>${found.length?found.map(n=>`<button data-calnote="${esc(n.id)}" style="display:block;margin:6px 0;border:0;background:#e9e1ff;border-radius:10px;padding:9px">${esc(n.title||'ไม่มีชื่อ')}</button>`).join(''):'ไม่มีโน้ตในวันนี้'}</div>`};
$('calendarResults').onclick=e=>{const b=e.target.closest('[data-calnote]');if(b){$('calendarModal').classList.remove('show');const n=notes.find(x=>x.id===b.dataset.calnote);if(n)openEditor(n)}};
const NOTE_TEMPLATES=[
 {icon:'📔',title:'บันทึกประจำวัน',body:'วันนี้ฉันรู้สึกว่า…\nสิ่งที่ดีวันนี้:\nสิ่งที่อยากทำพรุ่งนี้:'},
 {icon:'🛒',title:'รายการซื้อของ',items:['']},
 {icon:'📚',title:'บันทึกการเรียน',body:'หัวข้อ:\nสิ่งที่ได้เรียนรู้:\nคำถามที่ยังสงสัย:'},
 {icon:'💡',title:'ไอเดียใหม่',body:'ไอเดีย:\nรายละเอียด:\nขั้นตอนถัดไป:'},
 {icon:'✅',title:'สิ่งที่ต้องทำวันนี้',items:['']},
 {icon:'🙏',title:'ขอบคุณ 3 อย่างวันนี้',body:'1.\n2.\n3.'}
];
$('templateList').innerHTML=NOTE_TEMPLATES.map((t,i)=>`<button type="button" data-template="${i}"><span>${t.icon}</span><b>${esc(t.title)}</b></button>`).join('');
$('templateList').addEventListener('click',e=>{const b=e.target.closest('[data-template]');if(!b)return;const t=NOTE_TEMPLATES[Number(b.dataset.template)];closeSheet('templateSheet');
 if(t.items){nextNoteKind='checklist';openEditor();checkItems=t.items.map(text=>({text,done:false}));drawCheckMain();setTimeout(()=>focusCheckItem(0),150)}else{openEditor();$('noteBody').value=t.body}
 $('noteTitle').value=t.title;});
$('openTemplates').onclick=()=>openSheet('templateSheet');
$('favoritesFilter').onclick=()=>{favoriteOnly=!favoriteOnly;$('favoritesFilter').textContent=favoriteOnly?'⭐ แสดงทั้งหมด':'⭐ โน้ตโปรด';render()};
const renderWithFavorites=render;render=function(){renderWithFavorites();if(favoriteOnly)[...$('notes').children].forEach(el=>{const n=notes.find(x=>x.id===el.dataset.open);if(n&&!n.favorite)el.remove()})};
function drawStickerSelection(){document.querySelectorAll('[data-sticker]').forEach(b=>b.classList.toggle('active',selectedStickers.includes(b.dataset.sticker)))}
$('noteStickers').onclick=e=>{const b=e.target.closest('[data-sticker]');if(!b)return;const v=b.dataset.sticker;selectedStickers=selectedStickers.includes(v)?selectedStickers.filter(x=>x!==v):[...selectedStickers,v];drawStickerSelection()};
const canvas=$('drawCanvas'),ctx=canvas.getContext('2d');let drawing=false,lastPoint=null;
function restoreDrawing(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fffdfd';ctx.fillRect(0,0,canvas.width,canvas.height);if(drawingData){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,canvas.width,canvas.height);im.src=drawingData}}
function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
canvas.onpointerdown=e=>{drawing=true;lastPoint=canvasPoint(e);canvas.setPointerCapture(e.pointerId)};
canvas.onpointermove=e=>{if(!drawing)return;const q=canvasPoint(e);ctx.strokeStyle='#806bb3';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(lastPoint.x,lastPoint.y);ctx.lineTo(q.x,q.y);ctx.stroke();lastPoint=q};
canvas.onpointerup=()=>{drawing=false;lastPoint=null};canvas.onpointercancel=()=>{drawing=false;lastPoint=null};
$('drawClear').onclick=()=>{drawingData='';restoreDrawing();$('drawStatus').textContent='ล้างภาพแล้ว'};$('drawSave').onclick=()=>{drawingData=canvas.toDataURL('image/png');$('drawStatus').textContent='แนบภาพวาดกับโน้ตแล้ว'};
$('recordVoice').onclick=async()=>{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('เบราว์เซอร์นี้ไม่รองรับอัดเสียง');return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});recordedChunks=[];mediaRecorder=new MediaRecorder(stream);mediaRecorder.ondataavailable=e=>{if(e.data.size)recordedChunks.push(e.data)};mediaRecorder.onstop=()=>{const blob=new Blob(recordedChunks,{type:mediaRecorder.mimeType||'audio/webm'}),file=new File([blob],`voice-${Date.now()}.webm`,{type:blob.type}),dt=new DataTransfer();[...$('noteFiles').files,file].forEach(f=>dt.items.add(f));$('noteFiles').files=dt.files;stream.getTracks().forEach(t=>t.stop());$('voiceStatus').textContent='เสียงพร้อมอัปโหลดเมื่อบันทึกโน้ต'};mediaRecorder.start();$('recordVoice').disabled=true;$('stopVoice').disabled=false;$('voiceStatus').textContent='กำลังอัดเสียง…'}catch(e){toast('ใช้ไมโครโฟนไม่ได้: '+e.message)}};
$('stopVoice').onclick=()=>{if(mediaRecorder?.state==='recording'){mediaRecorder.stop();$('recordVoice').disabled=false;$('stopVoice').disabled=true}};
$('voiceQuick').onclick=()=>{openEditor();setTimeout(()=>$('recordVoice').click(),100)};


function pinText(){return pinI18n[language]||pinI18n.en}
function updatePinLanguage(){const t=pinText();const set=(id,v)=>{const el=$(id);if(el)el.textContent=v};set('pinSettingsTitle',t.title);set('pinSettingsHint',t.hint);if($('pinSetup'))$('pinSetup').placeholder=t.placeholder;if($('pinConfirm'))$('pinConfirm').placeholder=t.confirm;set('pinSave',t.save);set('pinRemove',t.remove)}
updatePinLanguage();
$('languageQuickSelect').addEventListener('change',()=>setTimeout(updatePinLanguage,0));
$('languageSelect').addEventListener('change',()=>setTimeout(updatePinLanguage,0));
async function pinHash(pin){if(!window.crypto||!crypto.subtle)throw new Error('crypto');const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pin));return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('')}
$('pinSave').addEventListener('click',async()=>{const t=pinText();const pin=$('pinSetup').value.trim();const confirm=$('pinConfirm').value.trim();if(!/^\d{4,8}$/.test(pin)){toast(t.digits);return}if(pin!==confirm){toast(t.mismatch);return}try{const value=await pinHash(pin);safeStorage.setItem('note-pin-hash',value);$('pinSetup').value='';$('pinConfirm').value='';toast(t.saved);sessionStorage.removeItem('note-unlocked');lockApp()}catch(e){toast(t.crypto)}});
$('pinRemove').addEventListener('click',()=>{safeStorage.removeItem('note-pin-hash');sessionStorage.removeItem('note-unlocked');toast(pinText().removed);const shade=$('pinLock');if(shade)shade.remove()});
function lockApp(){if(window.MeowAndroid?.setAppLock)return; // the Android app locks with biometrics instead
 if(!safeStorage.getItem('note-pin-hash')||sessionStorage.getItem('note-unlocked')==='1')return;const t=pinText();const shade=document.createElement('div');shade.id='pinLock';shade.style='position:fixed;inset:0;z-index:99999;background:var(--bg);display:grid;place-items:center;padding:24px';shade.innerHTML='<section style="max-width:340px;width:100%;text-align:center;background:var(--bg);border:1px solid #e8dfee;border-radius:24px;padding:24px;box-shadow:0 18px 60px #33224420"><div style="font-size:42px">🐱</div><h2 id="pinUnlockTitle"></h2><p id="pinUnlockHint"></p><input id="pinUnlock" type="password" inputmode="numeric" maxlength="8" autocomplete="current-password" style="width:100%;box-sizing:border-box;padding:13px;border-radius:12px;border:1px solid #ddd;background:var(--bg);color:var(--ink)" aria-label="PIN"><button id="pinUnlockBtn" style="width:100%;margin-top:10px;padding:12px 20px;border:0;border-radius:12px;background:var(--purple);color:white"></button><p id="pinError" role="alert" style="color:#b44"></p></section>';document.body.append(shade);$('pinUnlockTitle').textContent=t.unlockTitle;$('pinUnlockHint').textContent=t.unlockHint;$('pinUnlockBtn').textContent=t.unlock;const unlock=async()=>{try{const value=await pinHash($('pinUnlock').value);if(value===safeStorage.getItem('note-pin-hash')){sessionStorage.setItem('note-unlocked','1');shade.remove()}else $('pinError').textContent=pinText().bad}catch(e){$('pinError').textContent=pinText().crypto}};$('pinUnlockBtn').onclick=unlock;$('pinUnlock').addEventListener('keydown',e=>{if(e.key==='Enter')unlock()});setTimeout(()=>$('pinUnlock').focus(),50)}

if('Notification'in window && Notification.permission==='default'){/* ask only when user opts in */}

// In the Android app the page runs in a WebView, where Google blocks its sign-in
// page; the app signs in natively and hands back a Google ID token instead.
let nativeSignInWaiter=null;
window.meowNativeSignInResult=(token,err)=>{const w=nativeSignInWaiter;nativeSignInWaiter=null;if(w){if(err)w.reject(new Error(err));else w.resolve(token)}};
async function nativeGoogleSignIn(){
 try{const token=await new Promise((resolve,reject)=>{nativeSignInWaiter={resolve,reject};window.MeowAndroid.signInWithGoogle()});
  await signInWithCredential(auth,GoogleAuthProvider.credential(token))}
 catch(e){if(e.message!=='cancelled')toast('เข้าสู่ระบบไม่สำเร็จ: '+e.message)}
}
$('googleSignIn').addEventListener('click',async()=>{
 if(window.MeowAndroid&&configured){nativeGoogleSignIn();return}
 if(!configured){toast('ต้องใส่ Firebase config ใน index.html ก่อน');$('notice').textContent='เปิด SETUP.md แล้วทำตามขั้นตอน จากนั้นใส่ค่าจาก Firebase Web App ลงใน firebaseConfig';return}
 try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment'].includes(e.code)){try{await signInWithRedirect(auth,new GoogleAuthProvider())}catch(err){toast(err.message)}}else toast('เข้าสู่ระบบไม่สำเร็จ: '+e.message)}
});
$('googleSignOut').addEventListener('click',()=>{try{window.MeowAndroid?.signOut()}catch{}signOut(auth).catch(e=>toast(e.message))});

$('languageSelect').value=language;
$('settingsOpen').addEventListener('click',()=>{$('settingsOverlay').classList.add('show');document.body.style.overflow='hidden';$('settingsAccountStatus').textContent=currentUser?(currentUser.email||'Google'):tr('notSignedIn')});
function closeSettings(){$('settingsOverlay').classList.remove('show');document.body.style.overflow=''}
$('settingsClose').addEventListener('click',closeSettings);$('settingsDone').addEventListener('click',closeSettings);
$('settingsOverlay').addEventListener('click',e=>{if(e.target===$('settingsOverlay'))closeSettings()});
$('languageSelect').addEventListener('change',e=>{language=e.target.value;safeStorage.setItem('note-language',language);applyLanguage()});
function openLanguagePanel(){const o=$('languageOverlay');if(o){o.classList.add('show');$('languageQuickSelect').value=language;
applyDriveLanguage();document.body.style.overflow='hidden';setTimeout(()=>$('languageQuickSelect').focus(),30)}}
function closeLanguagePanel(){const o=$('languageOverlay');if(o)o.classList.remove('show');document.body.style.overflow=''}
$('languageQuickOpen').addEventListener('click',openLanguagePanel);$('languagePanelClose').addEventListener('click',closeLanguagePanel);$('languageOverlay').addEventListener('click',e=>{if(e.target===$('languageOverlay'))closeLanguagePanel()});
$('languageQuickSelect').addEventListener('change',e=>{language=e.target.value;safeStorage.setItem('note-language',language);$('languageSelect').value=language;applyLanguage();});
$('languageQuickSelect').value=language;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('languageOverlay')?.classList.contains('show'))closeLanguagePanel()});
$('settingsSignIn').addEventListener('click',()=>{$('settingsOverlay').classList.remove('show');$('googleSignIn').click()});

if(configured){
 try{
  app=initializeApp(firebaseConfig);auth=getAuth(app);try{db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})})}catch{db=getFirestore(app)}
  getRedirectResult(auth).catch(e=>toast('เข้าสู่ระบบไม่สำเร็จ: '+e.message));
  onAuthStateChanged(auth,user=>{
   currentUser=user;
   $('googleSignIn').hidden=!!user;$('googleSignOut').hidden=!user;
   $('accountTitle').textContent=user?(user.displayName||'บัญชี Google'):'เชื่อมต่อบัญชี Google';
   $('accountHint').textContent=user?(user.email||'เข้าสู่ระบบแล้ว'):'เข้าสู่ระบบเพื่อซิงก์โน้ตของคุณ';
   $('avatar').textContent=user?(user.displayName||user.email||'G').slice(0,1).toUpperCase():'N';
   $('notice').textContent=user?'โน้ตของคุณเชื่อมกับบัญชีนี้และซิงก์ผ่าน Cloud Firestore':'เข้าสู่ระบบเพื่อซิงก์โน้ตข้ามอุปกรณ์ (ไม่ล็อกอินก็ใช้ได้ โน้ตจะเก็บในเครื่องนี้)';
   if(user)offerLocalImport(user);
   watchNotes();
  });
 }catch(e){$('notice').textContent='ตั้งค่า Firebase ไม่ถูกต้อง: '+e.message}
}else{$('notice').textContent='ยังไม่ได้ตั้งค่า Firebase: โปรดทำตาม SETUP.md ก่อน Google Sign-In และการซิงก์จะทำงานได้'}

// Virtual cat state, daily missions, mood statistics, JSON backup and in-app widget card.
const PET_KEY='meow-pet-v1', MISSION_KEY='meow-missions-v1';
const todayKey=()=>dayKey(new Date());
function readPet(){try{return {...{hunger:70,happiness:70,coins:0,xp:0,lastDay:todayKey()},...JSON.parse(safeStorage.getItem(PET_KEY)||'{}')}}catch{return {hunger:70,happiness:70,coins:0,xp:0,lastDay:todayKey()}}}
let pet=readPet();
function savePet(){safeStorage.setItem(PET_KEY,JSON.stringify(pet));renderPet()}
function catEmoji(){return pet.happiness<25?'😿':pet.hunger<25?'😾':pet.xp>=100?'😺':'🐱'}
function renderPet(){const level=1+Math.floor(pet.xp/100);try{window.MeowDiaryAndroid?.updateCatWidget?.(et('petName'),level,pet.coins,pet.hunger,pet.happiness)}catch{}$('petAvatar').classList.toggle('pet-sad',pet.happiness<25);$('petAvatar').classList.toggle('pet-hungry',pet.hunger<25);$('petLevel').textContent=`${et('petLevel')} ${level}`;$('petHungerLabel').textContent=`🍓 ${et('hunger')} ${pet.hunger}%`;$('petHappyLabel').textContent=`💗 ${et('happiness')} ${pet.happiness}%`;$('petHungerFill').style.width=pet.hunger+'%';$('petHappyFill').style.width=pet.happiness+'%';$('widgetCat').textContent=catEmoji();$('widgetPetName').textContent=et('petName');$('widgetWidgetStats').textContent=`${et('coins')}: ${pet.coins} · ${et('level')} ${level}`;$('widgetDiaryCount').textContent=`${et('todayNotes')}: ${notes.filter(n=>!n.deletedAt&&todayKeyFromTs(n.updatedAt)===todayKey()).length}`;renderMissions()}
function todayKeyFromTs(ts){return dayKey(new Date(ts||Date.now()))}
function missionState(){try{return JSON.parse(safeStorage.getItem(MISSION_KEY)||'{}')}catch{return {}}}
function isMoodSavedToday(){if(notes.some(n=>!n.deletedAt&&n.mood&&todayKeyFromTs(n.updatedAt)===todayKey()))return true;try{return !!JSON.parse(safeStorage.getItem('meow-moods')||'{}')[dayKey()]}catch{return false}}
function renderMissions(){const st=missionState(),today=todayKey();if(st.date!==today){st.date=today;st.done={};st.actions={};safeStorage.setItem(MISSION_KEY,JSON.stringify(st))}st.done=st.done||{};st.actions=st.actions||{};const todaysNotes=notes.some(n=>!n.deletedAt&&todayKeyFromTs(n.updatedAt)===today);const missions=[['note','📝',et('missionNote'),todaysNotes],['mood','💗',et('missionMood'),isMoodSavedToday()],['feed','🍓',et('missionFeed'),!!st.actions.feed],['play','🧶',et('missionPlay'),!!st.actions.play]];$('missionList').innerHTML=missions.map(([id,icon,label,condition])=>{const claimed=!!st.done[id];return `<div class="missionItem ${claimed?'done':''}"><span>${icon}</span><span class="missionText">${esc(label)}<br><small>${claimed?esc(et('done')):condition?esc(missionUi('xp')):'—'}</small></span>${claimed?'<span>✓</span>':condition?`<button data-mission="${id}">${esc(et('claim'))}</button>`:''}</div>`}).join('')}
function awardMission(id){const st=missionState();if(st.date!==todayKey()){st.date=todayKey();st.done={};st.actions={}}st.done=st.done||{};st.actions=st.actions||{};if(st.done[id])return;const condition={note:notes.some(n=>!n.deletedAt&&todayKeyFromTs(n.updatedAt)===todayKey()),mood:isMoodSavedToday(),feed:!!st.actions.feed,play:!!st.actions.play}[id];if(!condition)return;st.done[id]=true;pet.xp+=10;safeStorage.setItem(MISSION_KEY,JSON.stringify(st));savePet();toast(missionUi('reward').replace('{n}','10'))}
$('petFeed').addEventListener('click',()=>{pet.hunger=Math.min(100,pet.hunger+25);pet.happiness=Math.min(100,pet.happiness+4);const st=missionState();if(st.date!==todayKey()){st.date=todayKey();st.done={};st.actions={}}st.done=st.done||{};st.actions=st.actions||{};st.actions.feed=true;safeStorage.setItem(MISSION_KEY,JSON.stringify(st));savePet();toast(et('fed'))});
$('petPlay').addEventListener('click',()=>{pet.happiness=Math.min(100,pet.happiness+18);pet.hunger=Math.max(0,pet.hunger-8);pet.xp+=5;const st=missionState();if(st.date!==todayKey()){st.date=todayKey();st.done={};st.actions={}}st.done=st.done||{};st.actions=st.actions||{};st.actions.play=true;safeStorage.setItem(MISSION_KEY,JSON.stringify(st));savePet();toast(et('played'))});
$('petSleep').addEventListener('click',()=>{pet.hunger=Math.max(0,pet.hunger-3);pet.happiness=Math.min(100,pet.happiness+8);savePet();toast(et('slept'))});
// The cat reacts for a moment: happy eyes and hearts, or closed eyes and Zzz.
let petMoodTimer;
function petReact(mood,ms){const a=$('petAvatar');clearTimeout(petMoodTimer);a.classList.remove('pet-happy','pet-sleep');void a.offsetWidth;a.classList.add(mood);petMoodTimer=setTimeout(()=>a.classList.remove(mood),ms)}
$('petFeed').addEventListener('click',()=>petReact('pet-happy',2200));
$('petPlay').addEventListener('click',()=>petReact('pet-happy',2200));
$('petSleep').addEventListener('click',()=>petReact('pet-sleep',5000));
$('petAvatar').addEventListener('click',()=>petReact('pet-happy',1600));
$('missionList').addEventListener('click',e=>{const b=e.target.closest('[data-mission]');if(b)awardMission(b.dataset.mission)});
$('openMoodStats').addEventListener('click',()=>{const moods=JSON.parse(safeStorage.getItem('meow-moods')||'{}'),entries=Object.values(moods),counts={};entries.forEach(x=>{const k=x.mood||'—';counts[k]=(counts[k]||0)+1});const labels={'😊':et('moodHappy'),'😌':et('moodCalm'),'😐':et('moodNeutral'),'😔':et('moodSad'),'😤':et('moodStressed'),'🤩':et('moodExcited'),'💗':et('moodWarm'),'😴':et('moodTired')};const max=Math.max(1,...Object.values(counts));$('statsTiles').innerHTML=`<div class="statTile"><strong>${entries.length}</strong><span>${esc(et('days'))}</span></div><div class="statTile"><strong>${Object.keys(counts).length?esc(labels[Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0]]||Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0]):'—'}</strong><span>${esc(et('mostMood'))}</span></div>`;$('moodBars').innerHTML=entries.length?Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([m,n])=>`<div class="moodBarRow"><span>${esc(labels[m]||m)}</span><div class="moodBarTrack"><div class="moodBarFill" style="width:${n/max*100}%"></div></div><b>${n}</b></div>`).join(''):`<p>${esc(et('noMoodData'))}</p>`;$('statsModal').classList.add('show')});
$('statsClose').onclick=()=>$('statsModal').classList.remove('show');
$('openBackup').onclick=()=>{$('backupStatus').textContent='';$('backupModal').classList.add('show')};$('backupClose').onclick=()=>$('backupModal').classList.remove('show');
$('exportBackup').onclick=()=>{const payload={app:'Meow Diary',schemaVersion:1,exportedAt:new Date().toISOString(),notes,moods:JSON.parse(safeStorage.getItem('meow-moods')||'{}'),pet,missions:missionState(),settings:{language:safeStorage.getItem('note-language')||'th',dark:safeStorage.getItem('note-dark'),colorConfig:safeStorage.getItem('note-color-config'),noteColors:safeStorage.getItem('note-custom-note-colors')}};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`meow-diary-backup-${todayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('backupStatus').textContent=et('backupReady')};
$('importBackupBtn').onclick=()=>$('backupFile').click();
$('backupFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const payload=JSON.parse(await file.text());if(payload.app!=='Meow Diary'||payload.schemaVersion!==1)throw Error('schema');if(!(await appConfirm(et('confirmRestore'))))return;let skippedNotes=false;if(Array.isArray(payload.notes)&&payload.notes.length){if(!currentUser||!db){const byId=new Map(loadLocalNotes().map(n=>[n.id,n]));payload.notes.forEach(n=>{if(n?.id)byId.set(n.id,n)});const merged=[...byId.values()];if(persistLocalNotes(merged)){notes=merged;render()}else skippedNotes=true}else{for(const n of payload.notes){if(!n.id)continue;const {id,...data}=n;queueWrite(setDoc(doc(noteCollection(),id),{...data,updatedAt:serverTimestamp()},{merge:true}))}}}if(payload.moods&&typeof payload.moods==='object')safeStorage.setItem('meow-moods',JSON.stringify(payload.moods));if(payload.pet&&typeof payload.pet==='object'){pet={...pet,...payload.pet};savePet()}if(payload.missions)safeStorage.setItem(MISSION_KEY,JSON.stringify(payload.missions));if(payload.settings){if(payload.settings.language&&extraI18n[payload.settings.language]){language=payload.settings.language;safeStorage.setItem('note-language',language);$('languageSelect').value=language}for(const [k,store] of [['dark','note-dark'],['colorConfig','note-color-config'],['noteColors','note-custom-note-colors']])if(payload.settings[k]!==undefined&&payload.settings[k]!==null)safeStorage.setItem(store,payload.settings[k]);if(payload.settings.colorConfig){try{applyColorConfig(JSON.parse(payload.settings.colorConfig),false)}catch{}}if(payload.settings.dark!==undefined)document.body.classList.toggle('dark',payload.settings.dark==='1')}applyLanguage();if(currentUser)watchNotes();renderPet();$('backupStatus').textContent=skippedNotes?et('restorePartial'):et('restoreDone')}catch(err){$('backupStatus').textContent=et('badBackup')}finally{e.target.value=''}});
$('openWidget').onclick=()=>{$('widgetModal').classList.add('show');renderPet()};$('widgetClose').onclick=()=>$('widgetModal').classList.remove('show');$('widgetWrite').onclick=()=>{$('widgetModal').classList.remove('show');openEditor()};
// Update cat care values gently over time, without creating pressure or penalties.
function applyPetDailyDrift(){const d=todayKey();if(pet.lastDay!==d){pet.hunger=Math.max(25,pet.hunger-5);pet.happiness=Math.max(25,pet.happiness-3);pet.lastDay=d;savePet()}}
applyPetDailyDrift();applyExtraLanguage();renderPet();


// AI popup localization: every visible label and response is translated in all 12 supported languages.
const aiPopupI18n={
 th:{fab:'ผู้ช่วย AI',title:'ผู้ช่วย AI ของเหมียว',sub:'ช่วยสรุป จัดระเบียบข้อความ หรือหาไอเดียสำหรับไดอารี่',summary:'📝 สรุปบันทึก',ideas:'💡 ช่วยคิดไอเดีย',polish:'🪄 ปรับข้อความ',prompt:'🌷 ชวนเขียนไดอารี่',placeholder:'พิมพ์สิ่งที่อยากให้ช่วย...',ask:'✨ ให้ผู้ช่วยช่วยคิด',welcome:'สวัสดี! เลือกสิ่งที่อยากให้ช่วยได้เลย 💗',notice:"โหมดไม่ใช้ API: คำแนะนำพื้นฐานใช้ได้ทันที หากต้องการโมเดล AI จริง ให้กดดาวน์โหลดโมเดล (หลายร้อย MB) แล้วประมวลผลบนอุปกรณ์",insert:'ใส่คำตอบลงในโน้ต',empty:'ยังไม่มีข้อความในโน้ต ลองพิมพ์คำขอหรือเปิดโน้ตก่อนนะ',summaryHead:'สรุปบันทึก',ideasText:'ลองเขียนต่อจากคำถามเหล่านี้:\n• วันนี้มีเรื่องเล็ก ๆ อะไรที่ทำให้ยิ้มได้?\n• วันนี้ได้เรียนรู้อะไรเกี่ยวกับตัวเอง?\n• พรุ่งนี้อยากให้ตัวเองรู้สึกอย่างไร?',promptText:'เริ่มเขียนได้จากประโยคนี้:\n“วันนี้ฉันอยากจดจำเรื่องนี้ เพราะ...”\n\nหรือเล่าถึงช่วงเวลาที่ทำให้รู้สึกขอบคุณ 1 เรื่อง',polished:'จัดระเบียบช่องว่างและบรรทัดให้แล้ว',answer:'คำแนะนำจากผู้ช่วยแบบออฟไลน์',added:'เพิ่มคำตอบลงในโน้ตแล้ว'},
 en:{fab:'AI helper',title:'Meow AI Assistant',sub:'Summarize, tidy up text, or find ideas for your diary.',summary:'📝 Summarize note',ideas:'💡 Brainstorm ideas',polish:'🪄 Tidy up text',prompt:'🌷 Journal prompt',placeholder:'Type what you would like help with...',ask:'✨ Ask the helper',welcome:'Hi! Choose what you would like help with 💗',notice:"No-API mode: basic helpers work now. For a real local model, download it (several hundred MB) and run inference on this device.",insert:'Insert answer into note',empty:'There is no note text yet. Type a request or open a note first.',summaryHead:'Note summary',ideasText:'Try writing from these questions:\n• What small thing made you smile today?\n• What did you learn about yourself today?\n• How would you like to feel tomorrow?',promptText:'Start with this sentence:\n“Today I want to remember this because...”\n\nOr write about one thing you feel grateful for.',polished:'Cleaned up spacing and line breaks.',answer:'Offline helper suggestion',added:'Answer added to the note.'},
};

// Local-model UI copy for all 12 supported languages.
Object.assign(aiPopupI18n.th,{loadModel:"🧠 ดาวน์โหลดและเปิดใช้ AI ในเครื่อง",notLoaded:"ยังไม่ได้โหลดโมเดล AI ในเครื่อง",loading:"กำลังโหลดโมเดล AI…",ready:"AI ในเครื่องพร้อมใช้งานแล้ว · ไม่เสียค่า API",loadFailed:"โหลดโมเดลไม่สำเร็จ",generating:"กำลังให้ AI ในเครื่องตอบ…",localPrivacy:"กำลังใช้ AI ในเครื่อง ไม่มีการส่งข้อความไปยังบริการ AI",modelHelp:"โมเดลใช้พื้นที่หลายร้อย MB และดาวน์โหลดครั้งแรกครั้งเดียว ต้องเปิดผ่าน HTTPS หรือ localhost และแนะนำเบราว์เซอร์ที่รองรับ WebGPU",notReady:"AI ในเครื่องยังไม่พร้อมใช้งาน"});
Object.assign(aiPopupI18n.en,{loadModel:"🧠 Download & enable local AI",notLoaded:"Local AI model is not loaded",loading:"Loading the AI model…",ready:"Local AI is ready · No API fees",loadFailed:"Could not load the model",generating:"Local AI is generating a reply…",localPrivacy:"Using on-device AI. Your prompt is not sent to an AI service.",modelHelp:"The model is several hundred MB and downloads on first use. Open via HTTPS or localhost. A WebGPU-capable browser is recommended.",notReady:"Local AI is not ready"});

// No-download demo mode: translated across all 12 supported languages.
Object.assign(aiPopupI18n.th,{demoMode:"🧪 ทดลองใช้แบบไม่ดาวน์โหลด",demoReady:"โหมดทดสอบพร้อมใช้ · ไม่โหลดโมเดลและไม่เรียก API",demoNotice:"โหมดทดลอง: ใช้ตัวอย่างคำตอบเพื่อทดสอบหน้าตาและการทำงาน ไม่มีการดาวน์โหลดโมเดลหรือส่งข้อมูลออก"});
Object.assign(aiPopupI18n.en,{demoMode:"🧪 Try demo without download",demoReady:"Demo mode ready · No model download or API",demoNotice:"Demo mode: sample responses are used to test the interface. No model is downloaded and no data is sent out"});

Object.assign(aiPopupI18n.th,{demoSummary:'🧪 โหมดทดลอง (ไม่ต้องดาวน์โหลด)'});
Object.assign(aiPopupI18n.en,{demoSummary:'🧪 Demo mode (no download)'});

function aiText(key){return (aiPopupI18n[language]||aiPopupI18n.en)[key]||aiPopupI18n.en[key]||key}
function applyAiPopupLanguage(){const map={aiFabLabel:'fab',aiDemoSummary:'demoSummary',aiPopupTitle:'title',aiPopupSub:'sub',aiActionSummary:'summary',aiActionIdeas:'ideas',aiActionPolish:'polish',aiActionPrompt:'prompt',aiAsk:'ask',aiPopupNotice:'notice',aiInsert:'insert',aiLoadLocalModel:'loadModel',aiDemoMode:'demoMode'};for(const [id,key] of Object.entries(map)){const el=$(id);if(el)el.textContent=aiText(key)}$('aiPopupNotice').textContent=demoAiMode?aiText('demoNotice'):(localAiPipeline?aiText('localPrivacy'):aiText('notice')+'\n'+aiText('modelHelp'));if(!$('aiModelStatus').dataset.busy)$('aiModelStatus').textContent=demoAiMode?aiText('demoReady'):(localAiPipeline?aiText('ready'):aiText('notLoaded'));$('aiPrompt').placeholder=aiText('placeholder');$('aiPrompt').setAttribute('aria-label',aiText('placeholder'));$('aiPopupClose').setAttribute('aria-label',language==='th'?'ปิด':language==='ja'?'閉じる':language==='zh'?'关闭':language==='ko'?'닫기':'Close')}
function aiSourceText(){const editor=stripImageTokens($('noteBody')?.value);if(editor)return editor;const latest=notes.filter(n=>!n.deletedAt).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];return latest?.body||''}
let localAiPipeline=null,localAiLoading=false,demoAiMode=false;
$('aiDemoMode').addEventListener('click',()=>{demoAiMode=true;applyAiPopupLanguage();setAiModelStatus('demoReady');$('aiOutput').textContent=aiText('demoNotice');$('aiOutput').dataset.answer='';$('aiInsert').hidden=true});
function setAiModelStatus(key){const el=$('aiModelStatus');el.textContent=aiText(key);el.dataset.busy=(key==='loading'||key==='generating')?'1':''}
async function loadLocalAiModel(){
 demoAiMode=false;
 if(localAiPipeline){setAiModelStatus('ready');return}
 if(localAiLoading)return;
 localAiLoading=true;$('aiLoadLocalModel').disabled=true;setAiModelStatus('loading');
 try{
  // The model runs in this browser tab. The library and model files are downloaded once and cached by the browser.
  const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2');
  env.allowLocalModels=false;env.useBrowserCache=true;
  const modelId='onnx-community/Qwen2.5-0.5B-Instruct';
  const onProgress=(p)=>{if(p&&p.status==='progress'&&Number.isFinite(p.progress))$('aiModelStatus').textContent=aiText('loading')+' '+Math.round(p.progress)+'%'};
  if(navigator.gpu){try{localAiPipeline=await pipeline('text-generation',modelId,{device:'webgpu',dtype:'q4',progress_callback:onProgress})}catch(gpuError){$('aiModelStatus').textContent=aiText('loading')+' · WebGPU unavailable, trying WASM…';localAiPipeline=await pipeline('text-generation',modelId,{device:'wasm',dtype:'q4',progress_callback:onProgress})}}
  else localAiPipeline=await pipeline('text-generation',modelId,{device:'wasm',dtype:'q4',progress_callback:onProgress});
  setAiModelStatus('ready');$('aiPopupNotice').textContent=aiText('localPrivacy');
 }catch(err){localAiPipeline=null;setAiModelStatus('loadFailed');$('aiOutput').textContent=aiText('loadFailed')+'\n'+aiText('modelHelp');}
 finally{localAiLoading=false;$('aiLoadLocalModel').disabled=false;applyAiPopupLanguage();if(localAiPipeline)setAiModelStatus('ready');else setAiModelStatus('loadFailed')}
}
$('aiLoadLocalModel').addEventListener('click',loadLocalAiModel);
async function aiRunLocal(action){
 const source=aiSourceText(),prompt=$('aiPrompt').value.trim();let task='';
 if(action==='summary')task='Summarize the diary note accurately in a few concise bullet points. Do not invent facts.\nNOTE:\n'+source;
 else if(action==='ideas')task='Suggest five gentle, specific journaling ideas based on this diary context.\nCONTEXT:\n'+(source||prompt||'No context');
 else if(action==='polish')task='Improve clarity and grammar while preserving the original meaning, personal voice, and language. Return only the revised text.\nTEXT:\n'+source;
 else if(action==='prompt')task='Give three warm, non-judgmental journaling prompts for today.';
 else task=prompt||'Suggest a helpful journaling idea for today.';
 if(!source&&action==='summary'||!source&&action==='polish'){ $('aiOutput').textContent=aiText('empty');$('aiInsert').hidden=true;return; }
 const langNames={th:'Thai',en:'English',es:'Spanish',fr:'French',de:'German',ja:'Japanese',ko:'Korean',zh:'Simplified Chinese',pt:'Portuguese',id:'Indonesian',vi:'Vietnamese',hi:'Hindi'};
 const messages=[{role:'system',content:'You are Meow Diary, a kind and concise journaling assistant. Respond in '+(langNames[language]||'English')+'. Respect privacy, do not diagnose mental health conditions, and do not invent diary facts. Keep the answer useful and warm.'},{role:'user',content:task}];
 setAiModelStatus('generating');$('aiOutput').textContent=aiText('generating');$('aiInsert').hidden=true;
 try{
  const result=await localAiPipeline(messages,{max_new_tokens:180,do_sample:true,temperature:0.7,top_p:0.9});
  let generated=result?.[0]?.generated_text;
  if(Array.isArray(generated)){const last=generated[generated.length-1];generated=last?.content||generated.map(x=>x?.content||'').join('\n')}
  if(typeof generated!=='string')generated='';
  generated=generated.trim();if(!generated)throw new Error('Empty model response');
  $('aiOutput').textContent=generated;$('aiOutput').dataset.answer=generated;$('aiInsert').hidden=false;
 }catch(err){$('aiOutput').textContent=aiText('notReady');$('aiInsert').hidden=true;}
 finally{setAiModelStatus('ready')}
}
function aiRun(action){if(localAiPipeline&&!demoAiMode){aiRunLocal(action);return}const t=aiText,source=aiSourceText(),prompt=$('aiPrompt').value.trim();let answer='';if(action==='summary'){if(!source){answer=t('empty');}else{const sentences=source.split(/(?<=[.!?。！？\n])\s+/).filter(Boolean);answer=t('summaryHead')+':\n'+(sentences.length>4?sentences.slice(0,4).join(' '):source)}}else if(action==='ideas'){answer=t('ideasText')}else if(action==='polish'){if(!source){answer=t('empty')}else{answer=source.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim()+'\n\n— '+t('polished')}}else if(action==='prompt'){answer=t('promptText')}else{const q=prompt.toLowerCase();if(!prompt){answer=t('ideasText')}else if(/summar|สรุป|resum|résum|zusammen|要約|요약|总结|ringkas|tóm tắt|सारांश/.test(q)){action='summary';return aiRun(action)}else if(/idea|ไอเดีย|ide[eé]|idee|アイデア|아이디어|灵感|ideia|gagasan|ý tưởng|विचार/.test(q)){action='ideas';return aiRun(action)}else if(/rewrite|polish|ปรับข้อความ|improve|amélior|verbesser|文章|문장|整理文字|organizar texto|rapikan|chỉnh văn bản|सुधार/.test(q)){action='polish';return aiRun(action)}else{answer=prompt+'\n\n'+t('promptText')}}$('aiOutput').textContent=answer;$('aiInsert').hidden=!answer||answer===t('empty');$('aiOutput').dataset.answer=answer}
$('aiPopupOpen').addEventListener('click',()=>{$('aiOverlay').classList.add('show');applyAiPopupLanguage();$('aiPrompt').focus()});$('aiPopupClose').addEventListener('click',()=>$('aiOverlay').classList.remove('show'));$('aiOverlay').addEventListener('click',e=>{if(e.target===$('aiOverlay'))$('aiOverlay').classList.remove('show')});
document.querySelector('.aiQuickActions').addEventListener('click',e=>{const b=e.target.closest('[data-ai-action]');if(b)aiRun(b.dataset.aiAction)});$('aiAsk').addEventListener('click',()=>aiRun('ask'));$('aiInsert').addEventListener('click',()=>{const answer=$('aiOutput').dataset.answer||'';if(!answer)return;if(!$('overlay').classList.contains('show'))openEditor();$('noteBody').value=($('noteBody').value.trim()?$('noteBody').value.trim()+'\n\n':'')+answer;$('aiOverlay').classList.remove('show');toast(aiText('added'))});
const _applyLanguageWithAi=applyLanguage;
applyLanguage=function(){_applyLanguageWithAi();applyAiPopupLanguage()};

applyLanguage();
initColorStudio();
if(!currentUser){notes=loadLocalNotes();render();$('syncStatus').textContent=nt('onDevice')}
lockApp();
