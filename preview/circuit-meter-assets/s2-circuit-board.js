(() => {
'use strict';
const {slots,preset,solve} = CircuitBoardModel;
const {pick} = window.labLanguage;
const el = id => document.getElementById(id);
const tools = {
  use:['Use','操作','Tap the switch to open or close it. Tap a bulb to loosen or refit it.','點選開關以開合電路；點選燈泡以扭鬆或裝回。','M9 15V5a2 2 0 0 1 4 0v6l3-1 6 3-2 8H12l-7-7 2-2z'],
  wire:['Wire','導線','Tap a slot between two posts to fit a wire.','點選兩接點之間的位置插上導線。','M2 12h26 M2 8v8 M28 8v8'],
  ammeter:['Ammeter','安培計','Fit the ammeter in series in a slot.','點選插位，將安培計串聯接入電路。','M0 12h6m18 0h6 M6 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M11 17l4-10 4 10m-6-4h4'],
  voltmeter:['Voltmeter','伏特計','Tap a component to measure across it, or tap an empty slot.','點選元件以量度兩端電壓，亦可點選空插位。','M0 12h6m18 0h6 M6 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M11 7l4 10 4-10'],
  resistor:['Resistor','電阻器','Tap a slot to fit or select a resistor, then choose its resistance.','點選插位裝上或選取電阻器，再選擇阻值。','M0 12h7v-4h16v8H7v-4m16 0h7'],
  bulb:['Bulb','燈泡','Tap a slot to fit a bulb. Use the same type of bulb for comparisons.','點選插位裝上燈泡。各燈泡的規格相同。','M0 12h7m16 0h7 M7 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M7 12h3a5 5 0 0 1 10 0h3'],
  switch:['Switch','開關','Tap a slot to fit an open switch. Select Use to close it.','點選插位裝上開關，再選「操作」閉合開關。','M0 15h6m2 0 15-10m1 10h6 M6 15a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M22 15a1 1 0 1 0 2 0a1 1 0 1 0-2 0'],
  cell:['Cell','電池','Tap a slot to place the cell. An existing cell moves to the new slot.','點選插位放置電池。若板上已有電池，電池會移至新位置。','M0 12h12m0-5v10m5-15v20m0-10h13'],
  erase:['Remove','移除','Tap a component or wire to remove it. Undo restores the last edit.','點選元件或導線將其移除；可按「復原」還原。','M4 14 15 3l10 9-9 9h-5z M8 10l11 10 M16 21h12'],
  reset:['Reset','重設','Clear board','清空電路板','M5 10a10 10 0 1 1 1 9 M5 3v7h7']
};
const stateText = {noCell:['No cell fitted','未裝上電池'],open:['Open circuit','開路'],closed:['Current flowing','有電流通過'],short:['Short circuit. Break the direct connection between the cell terminals.','短路。請斷開直接連通電池兩極的支路。']};
let experiment='simple', parts=preset(experiment), tool='use', schematic=false;
const history=[];
let selectedResistor=null;
const resistance=el('ohms');
for(const value of [1,2.2,4.7,10,22,47,100,220,470,1000]) resistance.add(new Option(value+' Ω',value));
resistance.value='10';
resistance.onchange=()=>{
 const part=parts[selectedResistor];
 if(part?.type==='resistor'){save();part.ohms=Number(resistance.value);}
 render();
};
let hint=tools.use.slice(2,4);
const x=n=>50+(n%4)*180, y=n=>65+Math.floor(n/4)*132;
const post=n=>String.fromCharCode(65+n%4)+(1+Math.floor(n/4));
const board=el('board');
function save() {
  history.push({experiment,parts:structuredClone(parts),guide:structuredClone(guide),failures,earned});
  if(history.length>80) history.shift();
}
const defs=`<defs>
<pattern id="grid" width="15" height="15" patternUnits="userSpaceOnUse"><circle cx="7.5" cy="7.5" r=".95" fill="var(--dots)"/></pattern>
<linearGradient id="steel" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#e2e6de"/><stop offset=".34" stop-color="#aebdb8"/><stop offset=".6" stop-color="#6a7879"/><stop offset="1" stop-color="#b7c7c0"/></linearGradient>
<linearGradient id="copper" x2="0" y2="1"><stop stop-color="#deb581"/><stop offset=".48" stop-color="#b17945"/><stop offset="1" stop-color="#79482e"/></linearGradient>
<linearGradient id="jacket" x2="0" y2="1"><stop stop-color="#396773"/><stop offset=".25" stop-color="#7196a2"/><stop offset=".55" stop-color="#406b79"/><stop offset="1" stop-color="#284751"/></linearGradient>
<radialGradient id="glass" cx=".38" cy=".26" r=".78"><stop stop-color="#cfddda"/><stop offset=".5" stop-color="#98ada9"/><stop offset="1" stop-color="#526969"/></radialGradient>
<radialGradient id="litglass" cx=".44" cy=".48" r=".65"><stop stop-color="#fff8c4"/><stop offset=".52" stop-color="#f5dc85"/><stop offset="1" stop-color="#d2ab55"/></radialGradient>
<radialGradient id="dimglass"><stop stop-color="#eed4a4"/><stop offset="1" stop-color="#a49173"/></radialGradient></defs>`;
function socket(cx,cy) {
 return `<g transform="translate(${cx} ${cy})"><circle r="9" fill="#152021" stroke="#7d8e8b" stroke-width="1.3"/><circle r="6.5" fill="url(#steel)"/><circle r="3" fill="#263738"/></g>`;
}
function terminals(half){
 return '<path d="M-'+half+' 0H'+half+'" stroke="#182323" stroke-width="6"/><path d="M-'+half+' -1H'+half+'" stroke="#a5b4b2" stroke-width="3"/>';
}
function physical(p,half,power) {
 if (p.type==='wire') return `<path d="M-${half} 0 Q0 -5 ${half} 0" fill="none" stroke="#233635" stroke-width="10"/><path d="M-${half} -1 Q0 -6 ${half} -1" fill="none" stroke="#799d91" stroke-width="6"/><path d="M-${half} -2 Q0 -7 ${half} -2" fill="none" stroke="#aec2b1" stroke-width="1.5"/>`;
 let art='';
 if (p.type==='cell') art=`<rect x="-54" y="-21" width="108" height="43" rx="7" fill="#192324" stroke="#8c9c99"/><rect x="-48" y="-17" width="88" height="34" rx="4" fill="url(#jacket)" stroke="#20383e"/><path d="M24 -17h16v34H24z" fill="url(#copper)"/><rect x="40" y="-8" width="6" height="16" rx="2" fill="url(#steel)"/><path d="M-40 0h7M28 0h9m-4.5-4.5v9" stroke="#f7f4df" stroke-width="2.5"/><text x="-6" y="4" fill="#edf2e8" text-anchor="middle" font-size="11" font-weight="700">1.5 V</text>`;
 if (p.type==='switch') art=`<rect x="-42" y="-17" width="84" height="35" rx="6" fill="#ced1bf" stroke="#697567" stroke-width="2"/><rect x="-35" y="-6" width="15" height="12" rx="2" fill="#947647"/><rect x="19" y="-6" width="16" height="12" rx="2" fill="#947647"/><g transform="rotate(${p.closed?0:-28} -27 0)"><rect x="-27" y="-4" width="57" height="8" rx="3" fill="url(#copper)" stroke="#6f4d28"/><rect x="17" y="-7" width="16" height="14" rx="4" fill="#36464c" stroke="#a5b1a8"/></g><circle cx="-27" r="4.5" fill="url(#steel)"/>`;
 if(p.type==='resistor'){
   const exponent=Math.floor(Math.log10(p.ohms))-1;
   const digits=Math.round(p.ohms/10**exponent);
   const colors=['#202323','#78452e','#be382f','#f38d32','#eccc38','#438955','#3868a6','#8756a2','#8b9190','#faf8ed'];
   const bands=[colors[Math.floor(digits/10)],colors[digits%10],exponent<0?'#c6a34d':colors[exponent],'#78452e'];
   art='<rect x="-31" y="-10" width="62" height="20" rx="8" fill="#9fc4d3" stroke="#495c64" stroke-width="2"/>'+bands.map((color,i)=>`<rect x="${[-23,-14,-5,16][i]}" y="-9" width="5" height="18" fill="${color}"/>`).join('');
 }
 if (p.type==='bulb') {
   art='<rect x="-36" y="-17" width="72" height="35" rx="6" fill="#bbc4b4" stroke="#68786e" stroke-width="2"/><circle r="24" fill="url(#steel)" stroke="#536964" stroke-width="2"/>';
   if (!p.fitted) art+='<circle r="17" fill="#243032" stroke="#9e9e83" stroke-width="3"/><circle r="5" fill="#b79a63"/>';
   else art+=`<circle r="21" fill="url(#glass)" stroke="${power?'#d9bb76':'#8c9e9a'}" stroke-width="1.5"/><circle r="20" fill="url(#litglass)" opacity="${Math.sqrt(power||0)}"/><path d="M-8 13 -7 -3 -4 -6 -1 -2 2 -6 5 -2 8 -5 9 13" fill="none" stroke="${power?'#a66222':'#4c605c'}" stroke-width="1.9"/><path d="M-15 -6Q-13 -13 -5 -15" fill="none" stroke="#fff" stroke-opacity=".8" stroke-linecap="round" stroke-width="2.6"/>`;
 }
 return terminals(half)+art;
}
function symbol(p,half) {
 const line=(d,extra='')=>'<path d="'+d+'" '+extra+'/>';
 const end=n=>'M-'+half+' 0H-'+n+' M'+n+' 0H'+half;
 let art='';
 if(p.type==='resistor') art=line(end(23))+line('M-23 -9h46v18h-46z');
 if(p.type==='wire') art=line('M-'+half+' 0H'+half);
 if(p.type==='cell') art=line('M-'+half+' 0H-6 M6 0H'+half+' M6 -19v38')+line('M-6 -10v20','stroke-width="6"');
 if(p.type==='switch') art=line(end(22))+line('M-20 0L20 '+(p.closed?'0':'-19'))+'<circle cx="-22" r="3" fill="var(--board)"/><circle cx="22" r="3" fill="var(--board)"/>';
 if(p.type==='bulb') art=p.fitted?line(end(20))+'<circle r="20"/>'+line('M-20 0h8a12 12 0 0 1 24 0h8'):line(end(17))+'<circle cx="-17" r="3"/><circle cx="17" r="3"/>';
 return '<g fill="none" stroke="var(--symbol)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">'+art+'</g>';
}
let directionMode='';
function directionOverlay(active){
 if(!directionMode || !active.size) return '';
 const electrons=directionMode==='electron';
 const color=electrons?'#a9e8ff':'#ffdc62';
 let svg='<g pointer-events="none" aria-hidden="true" class="direction-overlay">';
 for(const {id,a,b} of slots){
   if(!active.has(id)) continue;
   const vertical=b-a===4, half=vertical?66:90;
   const sign=active.get(id)*(electrons?-1:1);
   const p=parts[id];
   svg+=`<g data-flow-slot="${id}" data-sign="${sign}" transform="translate(${(x(a)+x(b))/2} ${(y(a)+y(b))/2}) rotate(${vertical?90:0})">`;
   // Leave the cell body visible. Its two leads connect to the external circuit.
   const spans=p.type==='cell'?[[-half,schematic?-6:-48],[schematic?6:46,half]]:[[-half,half]];
   for(const [left,right] of spans){
     const curved=!schematic && p.type==='wire';
     const d=curved?`M${left} 0 Q0 -5 ${right} 0`:`M${left} 0H${right}`;
     const backing=electrons?10:6;
     const period=electrons?24:22;
     svg+=`<path d="${d}" fill="none" stroke="#29434a" stroke-width="${backing}"/>`;
     svg+=`<path d="${d}" fill="none" stroke="${color}" stroke-width="${electrons?5:3}" stroke-linecap="${electrons?'round':'butt'}" stroke-dasharray="${electrons?'0.1 23.9':'12 10'}"><animate attributeName="stroke-dashoffset" by="${-sign*period}" dur="0.8s" repeatCount="indefinite"/></path>`;
     if(!electrons){
       const at=left+(right-left)*0.72;
       svg+=`<path transform="translate(${at} ${curved?-2:0}) scale(${sign} 1)" d="M-5 -4L2 0L-5 4" fill="none" stroke="#293932" stroke-width="5"/><path transform="translate(${at} ${curved?-2:0}) scale(${sign} 1)" d="M-5 -4L2 0L-5 4" fill="none" stroke="${color}" stroke-width="2.8"/>`;
     }
   }
   svg+='</g>';
 }
 return svg+'</g>';
}
function meterFace(type,cx,cy,value){
 const amp=type==='ammeter', unit=amp?'A':'V';
 const reading=value==null?'—':value.toFixed(amp?3:2)+' '+unit;
 return `<g transform="translate(${cx} ${cy})" pointer-events="none"><circle r="14" fill="var(--panel)" stroke="var(--symbol)" stroke-width="2"/>${label(0,5,unit,16)}<rect x="-32" y="16" width="64" height="19" rx="3" fill="var(--panel)"/>${label(0,30,reading,13)}</g>`;
}
let failures=0,guide=null,earned=false,closed=false,audio=null;
function unlock(){
 const Context=window.AudioContext||window.webkitAudioContext;
 if(Context && matchMedia('(min-width:900px)').matches){audio??=new Context();audio.resume().catch(()=>{});}
}
board.addEventListener('pointerdown',unlock);
board.addEventListener('keydown',unlock);
let applause=null;
function praise(){
 if(!matchMedia('(min-width:900px)').matches)return;
 document.querySelector('.great-job')?.remove();
 const badge=document.createElement('div');
 badge.className='great-job';badge.textContent='Great job!';board.parentElement.append(badge);
 badge.onanimationend=()=>badge.remove();
 if(!audio)return;
 applause?.stop();
 const rate=audio.sampleRate,buffer=audio.createBuffer(1,rate*6,rate),samples=buffer.getChannelData(0);
 for(let t=0;t<6;t+=.012+Math.random()*.022){
   const start=Math.floor(t*rate),volume=.14+Math.random()*.25;
   for(let j=0;j<rate*.065 && start+j<samples.length;j++)
     samples[start+j]+=(2*Math.random()-1)*volume*Math.exp(-j/(rate*.011));
 }
 const source=audio.createBufferSource(),gain=audio.createGain(),now=audio.currentTime;
 source.buffer=buffer;source.connect(gain);gain.connect(audio.destination);
 gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.65,now+.3);
 gain.gain.setValueAtTime(.65,now+5);gain.gain.linearRampToValueAtTime(0,now+6);
 applause=source;source.onended=()=>{gain.disconnect();source.disconnect();if(applause===source)applause=null;};source.start();
}
function resetBoard(){
 if(!Object.keys(parts).length)return;
 save();const status=solve(parts).state;
 failures=earned?0:failures+1;earned=false;guide=null;selectedResistor=null;experiment='empty';
 if(failures>=2){
   for(const {id} of slots){
     const old=parts[id];
     if(status!=='short' && old && !(old.type==='switch'&&!old.closed || old.type==='bulb'&&!old.fitted))continue;
     const types=status==='short'?['resistor']:status==='noCell'?['cell']:['wire','bulb'];
     for(const type of types){
       const target=type==='resistor'?{type,ohms:10}:old?.type==='bulb'||type==='bulb'?{type:'bulb',fitted:true}:{type};
       if(solve({...parts,[id]:target}).state==='closed'){delete parts[id];guide={[id]:target};choose('use');return;}
     }
   }
   guide={h00:{type:'cell'},v01:{type:'wire'},h10:status==='short'?{type:'resistor',ohms:10}:{type:'bulb',fitted:true},v00:{type:'wire'}};
 }
 parts={};choose('use');
}
function render() {
 const result=solve(parts), degree=Array(12).fill(0);
 if(result.state==='closed'){earned=true;failures=0;guide=null;if(!closed)praise();}
 closed=result.state==='closed';
 const activeSlot=document.activeElement?.getAttribute('data-slot');
 const bulbNames=new Map(slots.filter(s=>parts[s.id]?.type==='bulb').map((s,i)=>[s.id,'L'+(i+1)]));
 let svg=defs+'<rect width="640" height="394" rx="3" fill="var(--board)"/>';
 if(!schematic) svg+='<rect width="640" height="394" fill="url(#grid)"/>';
 for(let c=0;c<4;c++) svg+=label(x(c),27,String.fromCharCode(65+c),12);
 for(let r=0;r<3;r++) svg+=label(17,y(r*4)+4,r+1,12);
 let meterOverlays='';
 for(const edge of slots){
  const {id,a,b}=edge,p=parts[id],vertical=b-a===4,half=vertical?66:90;
  const cx=(x(a)+x(b))/2,cy=(y(a)+y(b))/2;
  if(p){degree[a]++;degree[b]++;}
  const position=post(a)+'–'+post(b);
  let accessible=p?pick(tools[p.type][0],tools[p.type][1]):pick('Empty slot','空插位');
  if(p?.type==='switch') accessible+=p.closed?pick(' (closed)','（已閉合）'):pick(' (open)','（已打開）');
  if(p?.type==='bulb'){
    const status=p.fitted?(result.power[id]?pick('lit','亮起'):pick('off','熄滅')):pick('loosened','已扭鬆');
    accessible+=' '+bulbNames.get(id)+pick(' ('+status+')','（'+status+'）');
  }
  if(p?.type==='resistor') accessible+=' '+p.ohms+' Ω';
  accessible+=' · '+position;
  let drawing=p?(schematic?symbol(p,half):physical(p,half,result.power[id])):'<path class="slot-guide" d="M-'+(half-10)+' 0H'+(half-10)+'"/>';
  if(result.active.has(id)){
    accessible+=pick(' · carrying current',' · 有電流通過');
  }
  const meter=p?.type==='ammeter'||p?.type==='voltmeter';
  if(meter) drawing=terminals(half);
  if(meter || p?.voltmeter){
    const readings=[];
    if(p.type==='ammeter') readings.push((result.amps[id]?.toFixed(3)??'—')+' A');
    if(p.type==='voltmeter'||p.voltmeter) readings.push((result.voltage[id]?.toFixed(2)??'—')+' V');
    accessible+=' · '+readings.join(' · ');
  }
  if(!p && (tool==='use'||tool==='erase')) drawing='';
  if(guide?.[id] && !p){
   const target=guide[id];
   drawing=`<g opacity=".52"><rect x="${6-half}" y="-21" width="${2*half-12}" height="42" rx="7" stroke="var(--letter)" stroke-dasharray="6 5" fill="none"/>${symbol(target,half)}</g>`;
   accessible=pick('Suggested connection: ','建議駁法：')+pick(...tools[target.type].slice(0,2))+' · '+position;
  }
  svg+=`<g class="slot" role="button" tabindex="0" data-slot="${id}" aria-label="${accessible}" transform="translate(${cx} ${cy})"><title>${accessible}</title><g transform="rotate(${vertical?90:0})">${drawing}</g>`;
  let instruments='';
  if(meter) instruments+=meterFace(p.type,0,0,p.type==='ammeter'?result.amps[id]:result.voltage[id]);
  if(p?.voltmeter){
    const dx=vertical?(a%4===3?-43:43):0,dy=vertical?0:(a<4?44:-42);
    const lead=vertical?`M0 -${half}H${dx}V${half}H0`:`M-${half} 0V${dy}H${half}V0`;
    instruments+=`<path d="${lead}" fill="none" stroke="var(--symbol)" stroke-width="2"/>`+meterFace('voltmeter',dx,dy,result.voltage[id]);
  }
  if(instruments) meterOverlays+=`<g pointer-events="none" transform="translate(${cx} ${cy})">${instruments}</g>`;
  if(p?.type==='resistor') svg+=label(vertical?34:0,vertical?4:29,p.ohms+' Ω',13);
  if(p?.type==='bulb') svg+=label(vertical?32:0,vertical?4:36,bulbNames.get(id)+(p.fitted?'':' −'),12);
  if(p?.type==='switch' && !schematic) svg+=label(vertical?51:0,vertical?5:34,p.closed?pick('Closed','閉合'):pick('Open','打開'),14);
  if(!p && !guide?.[id] && tool!=='use' && tool!=='erase') svg+='<circle r="9" fill="var(--board)" stroke="var(--ring)"/><path d="M-4 0h8 M0 -4v8" stroke="var(--letter)"/>';
  svg+='<rect class="slot-focus" x="-52" y="-52" width="104" height="104" rx="10"/></g>';
 }
 for(let n=0;n<12;n++) {
   if(!schematic) svg+=socket(x(n),y(n));
   else if(degree[n]>=3) svg+='<circle cx="'+x(n)+'" cy="'+y(n)+'" r="5" fill="var(--symbol)"/>';
   else if(degree[n]===1 || tool!=='use') svg+='<circle cx="'+x(n)+'" cy="'+y(n)+'" r="3" fill="var(--ring)"/>';
 }
 svg+=directionOverlay(result.active)+meterOverlays;
 board.innerHTML=svg;
 el('resistance-control').hidden=tool!=='resistor';
 const target=parts[selectedResistor]?.type==='resistor'?slots.find(s=>s.id===selectedResistor):null;
 el('resistance-label').textContent=pick('Resistance','阻值')+(target?' · '+post(target.a)+'–'+post(target.b):'');
 if(target) resistance.value=String(parts[selectedResistor].ohms);
 for(const [id,en,zh] of [['current','Conventional current','傳統電流方向'],['electron','Electron flow','電子移動方向']]){
   const button=el(id);
   button.textContent=pick(en,zh);
   button.setAttribute('aria-pressed',String(directionMode===id));
 }
 if(activeSlot) board.querySelector('[data-slot="'+activeSlot+'"]')?.focus({preventScroll:true});
 el('state').textContent=pick(...stateText[result.state]);
 el('indicator').dataset.state=result.state;el('count').textContent=result.lit+' / '+result.total;
 el('preset').value=experiment;
 el('real').setAttribute('aria-pressed',String(!schematic));el('diagram').setAttribute('aria-pressed',String(schematic));
 el('undo').disabled=!history.length;
}
function label(x,y,text,size){
 return `<text x="${x}" y="${y}" text-anchor="middle" fill="var(--letter)" font-family="Oxanium, sans-serif" font-size="${size}" font-weight="650" pointer-events="none">${text}</text>`;
}
function choose(name) {
 tool=name;
 for(const b of el('tools').children) {
   const active=b.dataset.tool===tool;
   b.setAttribute('aria-pressed',String(active));
   if(active && document.documentElement.dataset.style==='tech') b.setAttribute('data-augmented-ui','br-clip border');
   else b.removeAttribute('data-augmented-ui');
 }
 hint=guide?['Suggested connection: tap each dashed component to fit it.','建議駁法：逐一點選虛線元件，將它們接入電路。']:tools[tool].slice(2,4);
 el('hint').textContent=pick(...hint);render();
}
function operate(id) {
 const p=parts[id];
 if(guide?.[id] && !p){save();parts[id]={...guide[id]};choose(tool);return;}
 if(tool==='use'){
   if(p?.type==='resistor'){selectedResistor=id;choose('resistor');return;}
   if(p?.type==='switch'){save();p.closed=!p.closed;}
   else if(p?.type==='bulb'){save();p.fitted=!p.fitted;}
   else {hint=['Choose a tool to change this slot.','先選擇工具，再點選插位更換元件。'];el('hint').textContent=pick(...hint);return;}
 } else if(tool==='erase'){
   if(!p) return;save();if(p.voltmeter) delete p.voltmeter;else delete parts[id];
 } else {
   if(tool==='voltmeter' && p && p.type!=='voltmeter'){
     if(!p.voltmeter){save();p.voltmeter=true;}
     choose(tool);return;
   }
   if(tool==='resistor') selectedResistor=id;
   if(p?.type===tool){render();return;}
   save();
   if(tool==='cell') for(const key in parts) if(parts[key].type==='cell') delete parts[key];
   parts[id]={type:tool};
   if(tool==='resistor') parts[id].ohms=Number(resistance.value);
   if(tool==='switch') parts[id].closed=false;
   if(tool==='bulb') parts[id].fitted=true;
 }
 choose(tool);
}
for(const [id,[en,zh,,,icon]] of Object.entries(tools)){
 const b=document.createElement('button');b.type='button';b.className='tool';b.dataset.tool=id;
 b.innerHTML='<svg viewBox="0 0 30 24" aria-hidden="true"><path d="'+icon+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span></span>';
 b.lastElementChild.textContent=pick(en,zh);
 b.title=pick(tools[id][2],tools[id][3]);
 b.onclick=id==='reset'?resetBoard:()=>choose(id);el('tools').append(b);
}
board.addEventListener('click',ev=>{const slot=ev.target.closest('[data-slot]');if(slot)operate(slot.dataset.slot);});
board.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){const slot=ev.target.closest('[data-slot]');if(slot){ev.preventDefault();operate(slot.dataset.slot);}}});
el('preset').onchange=()=>{save();guide=null;earned=false;failures=0;selectedResistor=null;experiment=el('preset').value;parts=preset(experiment);choose(experiment==='empty'?'cell':'use');};
el('undo').onclick=()=>{const last=history.pop();if(last){guide=last.guide;failures=last.failures;earned=last.earned;parts=last.parts;experiment=last.experiment;choose(tool);}};
for(const id of ['current','electron']) el(id).onclick=()=>{
 directionMode=directionMode===id?'':id;
 render();
};
el('real').onclick=()=>{schematic=false;render();};el('diagram').onclick=()=>{schematic=true;render();};
function theme(){
 const night=document.documentElement.dataset.style==='tech';
 if(night)el('frame').setAttribute('data-augmented-ui','tl-clip tr-clip br-clip bl-clip border');
 else el('frame').removeAttribute('data-augmented-ui');
 choose(tool);
}
const nav=document.querySelector('lab-navigation')?.shadowRoot;
if(nav){
 const css=document.createElement('link');css.rel='stylesheet';css.href='assets/night-lab-nav.css';nav.append(css);
 const trim=document.createElement('style');
 trim.textContent='nav :is(a,button){box-sizing:border-box;min-width:44px;min-height:44px}:host([data-theme=tech]){border-image:none}:host([data-theme=tech]) nav>button{background:#15252b;border:1px solid #54858b;box-shadow:none}:host([data-theme=tech]) nav>a{text-shadow:none}';
 nav.append(trim);
}
window.addEventListener('lab-language-change',()=>{
 for(const b of el('tools').children){
   const [en,zh]=tools[b.dataset.tool];
   b.lastElementChild.textContent=pick(en,zh);
   b.title=pick(tools[b.dataset.tool][2],tools[b.dataset.tool][3]);
 }
 el('hint').textContent=pick(...hint);
 render();
});
window.addEventListener('lab-theme-change',theme);theme();
})();
