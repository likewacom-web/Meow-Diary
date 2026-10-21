// Draws the LINE-style cat stickers as SVG and renders them to stickers/*.png.
// Run: node tools/make-stickers.js preview.png  (needs Playwright + the Loma Thai font)
const {chromium}=require('playwright');const fs=require('fs');
const OUT=require('path').join(__dirname,'..','stickers');fs.mkdirSync(OUT,{recursive:true});
const L='#4b3b66';// outline
const FUR={white:['#fffaf3','#ffb3c7'],orange:['#ffc98a','#ff9fb0'],grey:['#d5d2e3','#ffb3c7'],black:['#55506a','#ff9fb8']};
const heart=(x,y,s,c='#ff5c8a')=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0,6 C-10,-4 -18,6 -10,14 L0,24 L10,14 C18,6 10,-4 0,6Z" fill="${c}" stroke="${L}" stroke-width="${2.5/s}" stroke-linejoin="round"/>`;
const star=(x,y,r,c='#ffd84d')=>{let p='';for(let i=0;i<10;i++){const a=Math.PI/5*i-Math.PI/2,rr=i%2?r*.45:r;p+=(i?'L':'M')+(x+Math.cos(a)*rr).toFixed(1)+','+(y+Math.sin(a)*rr).toFixed(1)}return `<path d="${p}Z" fill="${c}" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/>`};
const sparkle=(x,y,r,c='#ffd84d')=>`<path d="M${x},${y-r} Q${x+r*.18},${y-r*.18} ${x+r},${y} Q${x+r*.18},${y+r*.18} ${x},${y+r} Q${x-r*.18},${y+r*.18} ${x-r},${y} Q${x-r*.18},${y-r*.18} ${x},${y-r}Z" fill="${c}" stroke="${L}" stroke-width="2" stroke-linejoin="round"/>`;
const drop=(x,y,s,c='#8fd3ff')=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0,-12 C6,-2 9,3 9,7 A9,9 0 0 1 -9,7 C-9,3 -6,-2 0,-12Z" fill="${c}" stroke="${L}" stroke-width="${2.5/s}"/>`;
const S=`stroke="${L}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"`;
const EYES={
 dot:`<circle cx="94" cy="100" r="7.5" fill="${L}"/><circle cx="146" cy="100" r="7.5" fill="${L}"/><circle cx="96.5" cy="97" r="2.6" fill="#fff"/><circle cx="148.5" cy="97" r="2.6" fill="#fff"/>`,
 happy:`<path d="M84,104 Q94,90 104,104 M136,104 Q146,90 156,104" fill="none" ${S}/>`,
 closed:`<path d="M84,98 Q94,108 104,98 M136,98 Q146,108 156,98" fill="none" ${S}/>`,
 heart:heart(94,88,1.05)+heart(146,88,1.05),
 star:star(94,99,14)+star(146,99,14),
 angry:`<path d="M80,86 L104,96 M160,86 L136,96" fill="none" ${S}/><circle cx="95" cy="105" r="6" fill="${L}"/><circle cx="145" cy="105" r="6" fill="${L}"/>`,
 spiral:`<path d="M94,100 m0,0 a2,2 0 1 1 4,0 a5,5 0 1 1 -9,0 a8,8 0 1 1 16,0 a11,11 0 1 1 -21,0" fill="none" stroke="${L}" stroke-width="3.2" stroke-linecap="round"/><path d="M146,100 m0,0 a2,2 0 1 1 4,0 a5,5 0 1 1 -9,0 a8,8 0 1 1 16,0 a11,11 0 1 1 -21,0" fill="none" stroke="${L}" stroke-width="3.2" stroke-linecap="round"/>`,
 xd:`<path d="M84,92 L102,101 L84,110 M156,92 L138,101 L156,110" fill="none" ${S}/>`,
 droopy:`<path d="M83,99 L105,99 M135,99 L157,99" fill="none" ${S}/><path d="M86,100 A8,7 0 0 0 102,100Z M138,100 A8,7 0 0 0 154,100Z" fill="${L}"/>`,
 teary:`<ellipse cx="94" cy="100" rx="10" ry="11" fill="${L}"/><ellipse cx="146" cy="100" rx="10" ry="11" fill="${L}"/><circle cx="97" cy="95" r="4" fill="#fff"/><circle cx="149" cy="95" r="4" fill="#fff"/><circle cx="90" cy="105" r="2" fill="#fff"/><circle cx="142" cy="105" r="2" fill="#fff"/>`,
 wink:`<circle cx="94" cy="100" r="7.5" fill="${L}"/><circle cx="96.5" cy="97" r="2.6" fill="#fff"/><path d="M136,104 Q146,90 156,104" fill="none" ${S}/>`,
 sad:`<path d="M82,90 L102,84 M158,90 L138,84" fill="none" stroke="${L}" stroke-width="4" stroke-linecap="round"/><circle cx="94" cy="102" r="7" fill="${L}"/><circle cx="146" cy="102" r="7" fill="${L}"/><circle cx="96" cy="99" r="2.4" fill="#fff"/><circle cx="148" cy="99" r="2.4" fill="#fff"/>`,
 fierce:`<path d="M80,88 L106,95 M160,88 L134,95" fill="none" ${S}/><ellipse cx="95" cy="104" rx="7" ry="8" fill="${L}"/><ellipse cx="145" cy="104" rx="7" ry="8" fill="${L}"/><circle cx="97" cy="101" r="2.4" fill="#fff"/><circle cx="147" cy="101" r="2.4" fill="#fff"/>`,
};
const MOUTH={
 w:`<path d="M110,117 Q115,124 120,117 Q125,124 130,117" fill="none" stroke="${L}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
 open:`<path d="M108,116 Q120,114 132,116 Q130,138 120,138 Q110,138 108,116Z" fill="#c4415f" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M113,131 Q120,124 127,131 Q124,137 120,137 Q116,137 113,131Z" fill="#ff8fa8"/>`,
 o:`<ellipse cx="120" cy="124" rx="7" ry="9" fill="#c4415f" stroke="${L}" stroke-width="4"/>`,
 flat:`<path d="M112,121 L128,121" fill="none" stroke="${L}" stroke-width="4" stroke-linecap="round"/>`,
 wobble:`<path d="M106,126 Q111,119 116,126 Q120,132 124,126 Q129,119 134,126" fill="none" stroke="${L}" stroke-width="4" stroke-linecap="round"/>`,
 frown:`<path d="M110,126 Q120,116 130,126" fill="none" stroke="${L}" stroke-width="4" stroke-linecap="round"/>`,
 grin:`<path d="M104,114 L136,114 Q134,138 120,138 Q106,138 104,114Z" fill="#c4415f" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M110,114 L130,114 L129,119 L111,119Z" fill="#fff"/>`,
 fang:`<path d="M106,118 Q120,112 134,118" fill="none" stroke="${L}" stroke-width="4" stroke-linecap="round"/><path d="M112,117 L115,124 L118,116Z" fill="#fff" stroke="${L}" stroke-width="2" stroke-linejoin="round"/>`,
};
function cat({fur='white',eyes='dot',mouth='w',paws='down',blush=true,stripes=fur==='orange',back='',front='',head='',bodyDy=0}){
 const [c,pink]=FUR[fur];const nose=fur==='black'?'#ff9fb8':'#ff7f9e';
 const pawSet={
  down:`<ellipse cx="96" cy="176" rx="15" ry="11" fill="${c}" ${S}/><ellipse cx="144" cy="176" rx="15" ry="11" fill="${c}" ${S}/>`,
  wave:`<ellipse cx="96" cy="176" rx="15" ry="11" fill="${c}" ${S}/><g transform="rotate(-20 182 120)"><ellipse cx="182" cy="120" rx="14" ry="20" fill="${c}" ${S}/></g><path d="M192,92 q8,-4 12,4 M198,108 q8,0 10,8" fill="none" stroke="${L}" stroke-width="3.5" stroke-linecap="round"/>`,
  up:`<ellipse cx="54" cy="88" rx="13" ry="18" fill="${c}" ${S} transform="rotate(25 54 88)"/><ellipse cx="186" cy="88" rx="13" ry="18" fill="${c}" ${S} transform="rotate(-25 186 88)"/>`,
  fists:`<circle cx="70" cy="150" r="16" fill="${c}" ${S}/><circle cx="170" cy="150" r="16" fill="${c}" ${S}/><path d="M63,146 l8,0 M63,153 l8,0 M177,146 l-8,0 M177,153 l-8,0" stroke="${L}" stroke-width="2.5" stroke-linecap="round"/>`,
  cheeks:`<ellipse cx="62" cy="122" rx="13" ry="17" fill="${c}" ${S}/><ellipse cx="178" cy="122" rx="13" ry="17" fill="${c}" ${S}/>`,
  pray:`<ellipse cx="108" cy="166" rx="13" ry="19" fill="${c}" ${S} transform="rotate(-12 108 166)"/><ellipse cx="132" cy="166" rx="13" ry="19" fill="${c}" ${S} transform="rotate(12 132 166)"/>`,
  none:'',
 }[paws];
 const st=stripes?`<path d="M108,50 q4,10 0,16 M120,46 q4,12 0,20 M132,50 q4,10 0,16 M58,104 q10,2 16,0 M58,116 q10,0 16,-2 M182,104 q-10,2 -16,0 M182,116 q-10,0 -16,-2" fill="none" stroke="#e8954a" stroke-width="4" stroke-linecap="round"/>`:'';
 return `${back}
 <path d="M80,${150+bodyDy} Q72,${196+bodyDy} 120,${196+bodyDy} Q168,${196+bodyDy} 160,${150+bodyDy}Z" fill="${c}" ${S}/>
 <path d="M160,${170+bodyDy} q30,4 26,-30 q-2,-10 8,-12" fill="none" stroke="${L}" stroke-width="15" stroke-linecap="round"/><path d="M160,${170+bodyDy} q30,4 26,-30 q-2,-10 8,-12" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
 <path d="M58,84 L56,26 L106,50Z M182,84 L184,26 L134,50Z" fill="${c}" ${S}/>
 <path d="M66,66 L65,40 L90,52Z M174,66 L175,40 L150,52Z" fill="${pink}"/>
 <ellipse cx="120" cy="104" rx="72" ry="58" fill="${c}" ${S}/>${st}
 ${blush?`<ellipse cx="78" cy="120" rx="11" ry="6.5" fill="${pink}" opacity=".9"/><ellipse cx="162" cy="120" rx="11" ry="6.5" fill="${pink}" opacity=".9"/>`:''}
 ${EYES[eyes]}<path d="M115,110 L125,110 L120,115Z" fill="${nose}" stroke="${L}" stroke-width="2" stroke-linejoin="round"/>${MOUTH[mouth]}
 ${head}${pawSet}${front}`;
}
const zzz=`<g font-family="Loma" font-weight="bold" fill="#8b7bd8" stroke="#fff" stroke-width="5" paint-order="stroke"><text x="196" y="96" font-size="30">Z</text><text x="214" y="72" font-size="22">z</text><text x="200" y="128" font-size="17">z</text></g>`;
const q=(x,y,s,c='#8b7bd8')=>`<text x="${x}" y="${y}" font-family="DejaVu Sans" font-weight="bold" font-size="${s}" fill="${c}" stroke="${L}" stroke-width="2.5" paint-order="stroke">?</text>`;
const anger=`<g transform="translate(176 42)" fill="none" stroke="#ff4d5e" stroke-width="5" stroke-linecap="round"><path d="M-14,-4 q10,0 10,-10 M4,-14 q0,10 10,10 M14,4 q-10,0 -10,10 M-4,14 q0,-10 -10,-10"/></g>`;
const STICKERS=[
 ['hello','สวัสดี','#ff7aa2',{eyes:'happy',mouth:'open',paws:'wave'}],
 ['thanks','ขอบคุณ','#ff9f43',{fur:'orange',eyes:'closed',mouth:'w',paws:'pray',front:heart(48,40,1.2)+sparkle(196,50,12)}],
 ['love','รักนะ','#ff5c8a',{eyes:'heart',mouth:'open',paws:'down',front:`${heart(120,148,2.1)}`+heart(40,30,1.1)+heart(200,40,.9)}],
 ['goodnight','ฝันดี','#8b7bd8',{fur:'grey',eyes:'closed',mouth:'w',paws:'down',blush:true,head:`<path d="M66,58 Q100,-6 160,40 Q120,30 66,58Z" fill="#a79af0" ${S}/><circle cx="166" cy="40" r="10" fill="#fff" ${S}/>`,back:zzz+`<path d="M28,60 a22,22 0 1 0 22,-28 a17,17 0 1 1 -22,28Z" fill="#ffe27a" stroke="${L}" stroke-width="3"/>`}],
 ['ok','โอเค','#2ecc8f',{fur:'orange',eyes:'wink',mouth:'w',paws:'down',front:`<ellipse cx="184" cy="132" rx="19" ry="16" fill="#ffc98a" ${S}/><ellipse cx="184" cy="104" rx="8" ry="15" fill="#ffc98a" ${S}/><path d="M172,134 l16,0 M172,142 l16,0" stroke="${L}" stroke-width="2.5" stroke-linecap="round"/>`+sparkle(208,70,11)}],
 ['hungry','หิวแล้ว','#ff9f43',{eyes:'teary',mouth:'open',paws:'cheeks',front:drop(134,148,.9)+`<g transform="translate(176 40) rotate(-20)"><path d="M-26,0 L18,0 M-14,-9 L-14,9 M-2,-11 L-2,11 M10,-9 L10,9" stroke="${L}" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M18,0 L32,-12 L32,12Z" fill="#fff" stroke="${L}" stroke-width="3" stroke-linejoin="round"/><circle cx="-30" cy="0" r="7" fill="#fff" stroke="${L}" stroke-width="3"/></g>`}],
 ['tired','เหนื่อย','#8e8aa8',{fur:'grey',eyes:'droopy',mouth:'wobble',paws:'down',front:drop(186,70,1.3)+drop(52,84,.9),head:`<path d="M84,78 l6,8 l6,-8 l6,8 M138,78 l6,8 l6,-8 l6,8" fill="none" stroke="#9b8fd0" stroke-width="2.5" opacity=".7"/>`}],
 ['cry','ร้องไห้','#4aa8ff',{eyes:'teary',mouth:'wobble',paws:'down',front:`<path d="M86,112 Q80,140 86,170 L98,170 Q96,140 98,112Z M142,112 Q144,140 142,170 L154,170 Q160,140 154,112Z" fill="#8fd3ff" stroke="${L}" stroke-width="3" opacity=".95"/>`}],
 ['angry','โกรธแล้ว','#ff4d5e',{fur:'orange',eyes:'angry',mouth:'frown',paws:'fists',blush:false,back:`<ellipse cx="78" cy="120" rx="1" ry="1"/>`,front:anger+`<path d="M70,118 l14,0 M70,124 l14,0 M156,118 l14,0 M156,124 l14,0" stroke="#ff4d5e" stroke-width="3" stroke-linecap="round"/>`}],
 ['wow','ว้าว!','#ffb300',{eyes:'star',mouth:'o',paws:'up',front:sparkle(34,130,13)+sparkle(206,140,10)+sparkle(120,22,12,'#fff')}],
 ['fight','สู้ๆ','#ff6b3d',{fur:'orange',eyes:'fierce',mouth:'fang',paws:'fists',head:`<path d="M52,74 Q120,50 188,74 L186,88 Q120,64 54,88Z" fill="#ff5c5c" ${S}/><circle cx="120" cy="66" r="9" fill="#fff" stroke="${L}" stroke-width="3"/><circle cx="120" cy="66" r="4.5" fill="#ff5c5c"/><path d="M188,80 l24,-10 M188,82 l22,10" stroke="#ff5c5c" stroke-width="8" stroke-linecap="round"/>`}],
 ['confused','งงอะ','#8b7bd8',{fur:'grey',eyes:'spiral',mouth:'wobble',paws:'down',front:q(176,58,44)+q(36,62,30,'#ff8fb8')}],
 ['lol','555+','#ff7aa2',{fur:'white',eyes:'xd',mouth:'grin',paws:'cheeks',front:drop(56,92,.8)+drop(184,92,.8)+`<path d="M24,40 l14,8 M30,22 l8,14 M216,40 l-14,8 M210,22 l-8,14" stroke="${L}" stroke-width="4" stroke-linecap="round"/>`}],
 ['sorry','ขอโทษน้า','#6c8cff',{fur:'grey',eyes:'sad',mouth:'frown',paws:'pray',front:drop(178,60,1.2)}],
 ['yay','เย้!','#00b894',{fur:'orange',eyes:'happy',mouth:'open',paws:'up',front:`<g stroke="${L}" stroke-width="2"><rect x="30" y="30" width="10" height="16" fill="#ff7aa2" transform="rotate(25 35 38)"/><rect x="200" y="28" width="10" height="16" fill="#7ad0ff" transform="rotate(-30 205 36)"/><rect x="214" y="96" width="9" height="14" fill="#ffd84d" transform="rotate(40 218 103)"/><rect x="16" y="104" width="9" height="14" fill="#9fe6a0" transform="rotate(-20 20 111)"/></g>`+star(120,20,12)}],
 ['miss','คิดถึงนะ','#e36fa8',{fur:'black',eyes:'closed',mouth:'w',paws:'none',front:`<rect x="78" y="134" width="84" height="56" rx="22" fill="#ffd1e0" ${S}/>${heart(120,146,1.3)}<ellipse cx="88" cy="150" rx="13" ry="10" fill="#55506a" ${S}/><ellipse cx="152" cy="150" rx="13" ry="10" fill="#55506a" ${S}/>`+heart(40,36,1)+heart(198,30,.8)}],
];
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:260,height:280},deviceScaleFactor:1});
 const sheet=[];
 for(const [key,cap,col,o] of STICKERS){
  const fs2=cap.length>6?30:36;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="260" viewBox="-10 -10 260 280">
<defs><filter id="o" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="7" result="d"/><feFlood flood-color="#fff"/><feComposite in2="d" operator="in" result="w"/><feGaussianBlur in="d" stdDeviation="3" result="b"/><feOffset in="b" dy="3" result="bo"/><feFlood flood-color="#3a2b55" flood-opacity=".28"/><feComposite in2="bo" operator="in" result="sh"/><feMerge><feMergeNode in="sh"/><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<g filter="url(#o)">${cat(o)}<text x="120" y="244" text-anchor="middle" font-family="Loma" font-weight="bold" font-size="${fs2}" fill="${col}" stroke="${L}" stroke-width="7" stroke-linejoin="round" paint-order="stroke">${cap}</text></g></svg>`;
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await p.locator('svg').screenshot({path:`${OUT}/${key}.png`,omitBackground:true});
  sheet.push(`<img src="data:image/png;base64,${fs.readFileSync(OUT+"/"+key+".png").toString("base64")}">`);
 }
 const pv=await b.newPage({viewport:{width:1000,height:1100}});
 await pv.setContent(`<body style="margin:0;background:#e9f0ff;display:flex;flex-wrap:wrap;gap:6px;padding:10px">${sheet.join('')}</body>`);
 await pv.waitForTimeout(300);await pv.screenshot({path:process.argv[2]});
 console.log(JSON.stringify(STICKERS.map(s=>[s[0],s[1]])));await b.close();
})();
