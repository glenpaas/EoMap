// ════════════════════════════ STATE ════════════════════════════
let S = {
  view:'home', vTab:'photos', delStatus:'delivered',
  stores:[
    {id:1,name:'Rimi Ülemiste'},{id:2,name:'Maxima Kristiine'},
    {id:3,name:'Selver Rocca al Mare'},{id:4,name:'Prisma Ülemiste'},
    {id:5,name:'Coop Mustamäe'},{id:6,name:'Lidl Ülemiste'}
  ],
  av:null, visits:[], selStore:null
};

try{const d=JSON.parse(localStorage.getItem('vp2')||'{}');
  if(d.stores)S.stores=d.stores;
  if(d.visits)S.visits=d.visits;
  if(d.av)S.av=d.av;
}catch(e){}

function save(){try{localStorage.setItem('vp2',JSON.stringify({stores:S.stores,visits:S.visits,av:S.av}))}catch(e){}}

// ════════════════════════════ UTILS ════════════════════════════
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}
function ft(d){if(!d)return'--:--';const x=new Date(d);return x.getHours().toString().padStart(2,'0')+':'+x.getMinutes().toString().padStart(2,'0')}
function fd(d){if(!d)return'---';return new Date(d).toLocaleDateString('et-EE',{day:'2-digit',month:'2-digit',year:'numeric'})}
function fdt(d){return fd(d)+' '+ft(d)}
function dur(a,b){if(!a||!b)return null;const m=Math.floor((new Date(b)-new Date(a))/60000);const h=Math.floor(m/60);return h>0?h+'t '+(m%60)+'min':m+' min'}
function gs(id){return S.stores.find(s=>s.id===id)}
function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}

// ════════════════════════════ NAV ════════════════════════════
function go(v){
  S.view=v;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const b=document.getElementById('nav-'+v);if(b)b.classList.add('active');
  render();
}

function om(id){document.getElementById(id).classList.add('show')}
function cm(id){document.getElementById(id).classList.remove('show')}

// ════════════════════════════ RENDER ════════════════════════════
function render(){
  const app=document.getElementById('app');
  app.className='fade-in';void app.offsetWidth;
  const dot=document.getElementById('vDot');if(dot)dot.style.display=S.av?'block':'none';
  const views={home:vHome,visit:vVisit,orders:vOrders,delivery:vDelivery,history:vHistory};
  app.innerHTML=(views[S.view]||vHome)();
}

// ─────────────────────────── HOME ───────────────────────────
function vHome(){
  const now=new Date();
  let activeHtml='';
  if(S.av){
    const st=gs(S.av.storeId);
    activeHtml=`<div class="section">
      <div class="sec-hd"><span>Aktiivne külastus</span></div>
      <div class="checkin-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
          <div>
            <div style="font-size:12px;color:var(--t2);margin-bottom:4px">${esc(st?.name||'Pood')}</div>
            <div class="time-big">${ft(S.av.checkIn?.time)}</div>
            <div class="time-date">${fd(S.av.checkIn?.time)}</div>
          </div>
          <span class="pill pill-warn pill-dot">Aktiivne</span>
        </div>
        ${S.av.checkIn?.gps?`<div class="gps-tag">📍 ${S.av.checkIn.gps.lat.toFixed(5)}, ${S.av.checkIn.gps.lng.toFixed(5)} · ±${Math.round(S.av.checkIn.gps.accuracy)}m</div>`:'<div class="gps-tag">📍 GPS puudub</div>'}
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="go('visit')">Jätka külastust</button>
          <button class="btn btn-danger btn-sm" onclick="doCheckOut()">Check-Out ↗</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        <div style="background:var(--infd);border-radius:var(--rs);padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:600;color:var(--inf)">${S.av.photos?.length||0}</div>
          <div style="font-size:10px;color:var(--inf);margin-top:1px">Fotot</div>
        </div>
        <div style="background:var(--okd);border-radius:var(--rs);padding:10px;text-align:center">
          <div style="font-size:18px;font-weight:600;color:var(--ok)">${S.av.tasks?.filter(t=>t.done).length||0}/${S.av.tasks?.length||0}</div>
          <div style="font-size:10px;color:var(--ok);margin-top:1px">Ülesannet</div>
        </div>
      </div>
    </div>`;
  }

  const storeOpts=S.stores.map(s=>`<option value="${s.id}"${S.selStore===s.id?' selected':''}>${esc(s.name)}</option>`).join('');

  const recent=[...S.visits].reverse().slice(0,4).map(v=>{
    const st=gs(v.storeId);
    const d=dur(v.checkIn?.time,v.checkOut?.time);
    return `<div class="visit-list-card" style="margin-top:8px" onclick="showReport('${v.id}')">
      <div class="visit-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:14px;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(st?.name||'Pood')}</div>
        <div style="font-size:12px;color:var(--t2)">${fd(v.checkIn?.time)} · ${ft(v.checkIn?.time)}–${ft(v.checkOut?.time)}${d?' · '+d:''}</div>
        <div style="display:flex;gap:5px;margin-top:5px;flex-wrap:wrap">
          ${v.photos?.length?`<span class="pill pill-inf">${v.photos.length} fotot</span>`:''}
          ${v.orders?.length?`<span class="pill pill-ok">${v.orders.length} tell.</span>`:''}
          ${v.deliveries?.length?`<span class="pill pill-warn">${v.deliveries.length} tarne</span>`:''}
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }).join('');

  return `
    <div class="topbar">
      <div style="width:32px;height:32px;border-radius:8px;background:var(--ad);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--a)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div class="topbar-title">Külastusgraafik</div>
      <span class="badge badge-ok">${fd(now)}</span>
    </div>
    ${activeHtml}
    ${!S.av?`<div class="section">
      <div class="sec-hd">Uus külastus</div>
      <div class="card">
        <div style="font-size:12px;color:var(--t2);margin-bottom:8px">Vali pood</div>
        <select class="store-sel" id="storeSel" onchange="S.selStore=parseInt(this.value)">
          <option value="">— Vali pood —</option>
          ${storeOpts}
        </select>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary" style="flex:1" onclick="doCheckIn()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Check-In
          </button>
          <button class="btn-icon btn" onclick="om('mAddStore')" title="Lisa pood">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>
    </div>`:''}
    <div class="section">
      <div class="sec-hd">
        <span>Viimased külastused</span>
        ${S.visits.length>0?`<span style="font-weight:400;font-size:11px;color:var(--t3)">${S.visits.length} kokku</span>`:''}
      </div>
      ${S.visits.length===0?`<div class="empty"><div class="empty-ico">📋</div><div class="empty-t">Külastusi pole veel</div><div class="empty-s">Alusta esimese poekülastusega ülal</div></div>`:recent}
    </div>
    <div style="height:20px"></div>`;
}

// ─────────────────────────── VISIT ───────────────────────────
function vVisit(){
  if(!S.av)return`<div class="topbar"><div class="topbar-title">Külastus</div></div>
    <div class="empty" style="margin-top:80px">
      <div class="empty-ico">📍</div>
      <div class="empty-t">Aktiivseid külastusi pole</div>
      <div class="empty-s">Mine Kodusse ja tee Check-In</div>
      <button class="btn btn-primary" style="margin-top:18px" onclick="go('home')">Mine koju</button>
    </div>`;
  const st=gs(S.av.storeId);
  const tabs=[['photos','Fotod'],['notes','Märkmed'],['tasks','Ülesanded']];
  const tabHtml=tabs.map(([k,l])=>`<button class="tab${S.vTab===k?' active':''}" onclick="setVTab('${k}')">${l}</button>`).join('');
  let body='';
  if(S.vTab==='photos')body=tabPhotos();
  if(S.vTab==='notes')body=tabNotes();
  if(S.vTab==='tasks')body=tabTasks();
  return `
    <div class="topbar">
      <div style="flex:1;min-width:0">
        <div class="topbar-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(st?.name||'Pood')}</div>
        <div style="font-size:10px;color:var(--t2)">Check-in: ${ft(S.av.checkIn?.time)} · ${fd(S.av.checkIn?.time)}</div>
      </div>
      <span class="pill pill-warn pill-dot">Live</span>
    </div>
    ${S.av.checkIn?.gps?`<div style="padding:6px 14px"><div class="gps-tag">📍 ${S.av.checkIn.gps.lat.toFixed(5)}, ${S.av.checkIn.gps.lng.toFixed(5)} · ±${Math.round(S.av.checkIn.gps.accuracy)}m</div></div>`:''}
    <div class="tabs">${tabHtml}</div>
    ${body}`;
}

function tabPhotos(){
  const bef=(S.av.photos||[]).filter(p=>p.type==='before');
  const aft=(S.av.photos||[]).filter(p=>p.type==='after');
  function grid(photos,type){
    const lbl=type==='before'?'Enne foto':'Pärast foto';
    const thumbs=photos.map(p=>`<div class="photo-thumb">
      <img src="${p.dataUrl}" alt="">
      <div class="photo-meta">${esc(p.exifDate||p.uploadedAt)}</div>
      <button class="photo-del" onclick="rmPhoto('${p.id}')">×</button>
    </div>`).join('');
    return `<div class="photo-grid">${thumbs}
      <label class="upload-zone" for="fi_${type}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <span>+ ${lbl}</span>
      </label>
      <input type="file" id="fi_${type}" accept="image/*" style="display:none" onchange="handlePhoto(event,'${type}')">
    </div>`;
  }
  return `<div class="section">
    <div class="sec-hd"><span>Enne pildid</span><span style="font-weight:400;color:var(--t3)">${bef.length} fotot</span></div>
    ${grid(bef,'before')}
  </div>
  <div class="section" style="margin-top:20px">
    <div class="sec-hd"><span>Pärast pildid</span><span style="font-weight:400;color:var(--t3)">${aft.length} fotot</span></div>
    ${grid(aft,'after')}
  </div>
  <div style="height:20px"></div>`;
}

function tabNotes(){
  return `<div class="section">
    <div class="sec-hd">Märkmed</div>
    <textarea class="inp" id="notesArea" placeholder="Kirjuta siia märkmed, tähelepanekud, probleemid, lahendused..." oninput="S.av.notes=this.value;save()" style="min-height:200px">${esc(S.av.notes||'')}</textarea>
    <div style="font-size:11px;color:var(--t3);margin-top:6px;text-align:right">${(S.av.notes||'').length} märki · Salvestub automaatselt</div>
  </div><div style="height:20px"></div>`;
}

function tabTasks(){
  const tasks=S.av.tasks||[];
  const done=tasks.filter(t=>t.done).length;
  const pct=tasks.length?Math.round(done/tasks.length*100):0;
  const items=tasks.map(t=>`<div class="task-item">
    <div class="chk${t.done?' done':''}" onclick="toggleTask('${t.id}')">
      ${t.done?`<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`:''}
    </div>
    <span class="task-text${t.done?' done':''}">${esc(t.text)}</span>
    <button class="x-btn" onclick="rmTask('${t.id}')">×</button>
  </div>`).join('');
  return `<div class="section">
    <div class="sec-hd"><span>Ülesanded</span><span style="font-weight:400;color:var(--t3)">${done}/${tasks.length} · ${pct}%</span></div>
    ${tasks.length>0?`<div style="height:4px;background:var(--s2);border-radius:2px;margin-bottom:10px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--ok);border-radius:2px;transition:width 0.3s"></div></div><div class="card">${items}</div>`:`<div style="text-align:center;padding:20px;color:var(--t3);font-size:13px">Ülesandeid pole lisatud</div>`}
    <button class="btn btn-outline btn-block" style="margin-top:10px" onclick="om('mAddTask')">+ Lisa ülesanne</button>
  </div><div style="height:20px"></div>`;
}

// ─────────────────────────── ORDERS ───────────────────────────
function vOrders(){
  if(!S.av)return noVisit('📦','Tellimused');
  const orders=S.av.orders||[];
  const total=orders.reduce((s,o)=>s+(parseFloat(o.price||0)*parseFloat(o.qty||0)),0);
  const rows=orders.map(o=>`<div class="order-row">
    <div style="flex:1;min-width:0">
      <div style="font-weight:500;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(o.product)}</div>
      ${o.notes?`<div style="font-size:11px;color:var(--t3);margin-top:1px">${esc(o.notes)}</div>`:''}
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div class="mono" style="font-size:13px;color:var(--t2)">${o.qty} ${esc(o.unit||'tk')}</div>
      ${o.price?`<div class="mono" style="font-size:12px;color:var(--a)">${(parseFloat(o.price)*parseFloat(o.qty)).toFixed(2)}€</div>`:''}
    </div>
    <button class="x-btn" onclick="rmOrder('${o.id}')">×</button>
  </div>`).join('');
  return `<div class="topbar">
    <div class="topbar-title">Tellimused</div>
    ${total>0?`<span class="badge badge-ok mono">${total.toFixed(2)}€</span>`:''}
  </div>
  <div class="section">
    ${orders.length>0?`<div class="card">${rows}</div>`:noContent('Tellimusi pole lisatud')}
    <button class="btn btn-primary btn-block" style="margin-top:10px" onclick="om('mAddOrder')">+ Lisa tellimus</button>
  </div>
  ${total>0?`<div class="section"><div class="card" style="display:flex;justify-content:space-between;align-items:center">
    <span style="color:var(--t2)">Tellimuste summa</span>
    <span class="mono" style="font-size:20px;font-weight:600;color:var(--a)">${total.toFixed(2)}€</span>
  </div></div>`:''}
  <div style="height:20px"></div>`;
}

// ─────────────────────────── DELIVERY ───────────────────────────
function vDelivery(){
  if(!S.av)return noVisit('🚚','Tarne');
  const dels=S.av.deliveries||[];
  const sm={delivered:0,partial:0,rejected:0};
  dels.forEach(d=>{if(sm[d.status]!==undefined)sm[d.status]++});
  const sPill={delivered:'pill-ok',partial:'pill-warn',rejected:'pill-err'};
  const sLabel={delivered:'Tarnitud',partial:'Osaline',rejected:'Keeldutud'};
  const rows=dels.map(d=>`<div class="card-sm" style="margin-top:8px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:14px">${esc(d.product)}</div>
        <div style="font-size:12px;color:var(--t2)">${d.qty} ${esc(d.unit||'tk')}</div>
        ${d.notes?`<div style="font-size:11px;color:var(--t3);margin-top:2px">${esc(d.notes)}</div>`:''}
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
        <span class="pill ${sPill[d.status]||'pill-inf'}">${sLabel[d.status]||d.status}</span>
        <button class="x-btn" onclick="rmDel('${d.id}')">×</button>
      </div>
    </div>
  </div>`).join('');
  return `<div class="topbar">
    <div class="topbar-title">Tarne</div>
    <span class="badge badge-ok">${dels.length} kirjet</span>
  </div>
  ${dels.length>0?`<div class="section">
    <div class="stat-grid">
      <div class="stat-box" style="background:var(--okd)"><div class="stat-num" style="color:var(--ok)">${sm.delivered}</div><div class="stat-lbl" style="color:var(--ok)">Tarnitud</div></div>
      <div class="stat-box" style="background:var(--ad)"><div class="stat-num" style="color:var(--a)">${sm.partial}</div><div class="stat-lbl" style="color:var(--a)">Osaline</div></div>
      <div class="stat-box" style="background:var(--errd)"><div class="stat-num" style="color:var(--err)">${sm.rejected}</div><div class="stat-lbl" style="color:var(--err)">Keeldutud</div></div>
    </div>
  </div>`:''}
  <div class="section">
    ${rows||noContent('Tarne kirjeid pole lisatud')}
    <button class="btn btn-primary btn-block" style="margin-top:10px" onclick="om('mAddDel')">+ Lisa tarne kirje</button>
  </div><div style="height:20px"></div>`;
}

// ─────────────────────────── HISTORY ───────────────────────────
function vHistory(){
  const vs=[...S.visits].reverse();
  const cards=vs.map(v=>{
    const st=gs(v.storeId);const d=dur(v.checkIn?.time,v.checkOut?.time);
    const sm={delivered:0,partial:0,rejected:0};(v.deliveries||[]).forEach(x=>{if(sm[x.status]!==undefined)sm[x.status]++});
    const orderTotal=(v.orders||[]).reduce((s,o)=>s+(parseFloat(o.price||0)*parseFloat(o.qty||0)),0);
    return `<div class="card" style="margin-top:10px;cursor:pointer" onclick="showReport('${v.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div style="font-weight:600;font-size:15px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:10px">${esc(st?.name||'Pood')}</div>
        <span class="pill pill-ok">✓ Lõpetatud</span>
      </div>
      <div style="font-size:12px;color:var(--t2);margin-bottom:8px">${fd(v.checkIn?.time)} &nbsp;·&nbsp; ${ft(v.checkIn?.time)}–${ft(v.checkOut?.time)}${d?' ('+d+')':''}</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        ${v.photos?.length?`<span class="pill pill-inf">${v.photos.length} fotot</span>`:''}
        ${v.orders?.length?`<span class="pill pill-ok">${v.orders.length} tell. ${orderTotal>0?'· '+orderTotal.toFixed(2)+'€':''}</span>`:''}
        ${sm.delivered?`<span class="pill pill-ok">${sm.delivered} tarnitud</span>`:''}
        ${sm.partial?`<span class="pill pill-warn">${sm.partial} osaline</span>`:''}
        ${sm.rejected?`<span class="pill pill-err">${sm.rejected} keeldutud</span>`:''}
        ${v.tasks?.length?`<span class="pill" style="background:var(--s3);color:var(--t2)">${v.tasks.filter(t=>t.done).length}/${v.tasks.length} ülesannet</span>`:''}
      </div>
    </div>`;
  }).join('');
  return `<div class="topbar">
    <div class="topbar-title">Ajalugu</div>
    <span class="badge badge-inf">${S.visits.length} külastust</span>
  </div>
  <div class="section">
    ${vs.length===0?`<div class="empty"><div class="empty-ico">📋</div><div class="empty-t">Ajalugu on tühi</div><div class="empty-s">Lõpetatud külastused ilmuvad siia</div></div>`:cards}
  </div><div style="height:20px"></div>`;
}

function noVisit(ico,title){
  return `<div class="topbar"><div class="topbar-title">${title}</div></div>
    <div class="empty" style="margin-top:80px">
      <div class="empty-ico">${ico}</div>
      <div class="empty-t">Aktiivseid külastusi pole</div>
      <div class="empty-s">Alusta Check-In-iga kodulehel</div>
      <button class="btn btn-primary" style="margin-top:18px" onclick="go('home')">Mine koju</button>
    </div>`;
}
function noContent(txt){return`<div style="text-align:center;padding:24px;color:var(--t3);font-size:13px">${txt}</div>`}

// ════════════════════════════ ACTIONS ════════════════════════════
function doCheckIn(){
  const el=document.getElementById('storeSel');
  const sid=el?parseInt(el.value):S.selStore;
  if(!sid){alert('Palun vali pood enne check-in!');return}
  const v={id:uid(),storeId:sid,status:'active',checkIn:{time:new Date().toISOString(),gps:null},checkOut:null,photos:[],notes:'',tasks:[],orders:[],deliveries:[]};
  const finish=()=>{S.av=v;save();go('visit')};
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(p=>{v.checkIn.gps={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy};finish()},finish,{timeout:6000,enableHighAccuracy:true});
  }else{finish()}
}

function doCheckOut(){
  if(!S.av)return;
  if(!confirm('Lõpeta külastus ja salvesta raport?'))return;
  const co={time:new Date().toISOString(),gps:null};
  const finish=()=>{S.av.checkOut=co;S.av.status='completed';S.visits.push({...S.av});S.av=null;save();go('home')};
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(p=>{co.gps={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy};finish()},finish,{timeout:6000});
  }else{finish()}
}

function addStore(){
  const n=document.getElementById('newStoreName').value.trim();
  if(!n)return;
  S.stores.push({id:Date.now(),name:n});
  save();cm('mAddStore');document.getElementById('newStoreName').value='';render();
}

function handlePhoto(e,type){
  const f=e.target.files[0];if(!f||!S.av)return;
  const r=new FileReader();
  r.onload=ev=>{
    const url=ev.target.result;
    const img=new Image();
    img.onload=()=>{
      let ed=null;
      try{
        if(typeof EXIF!=='undefined'){
          EXIF.getData(img,function(){
            const dt=EXIF.getTag(this,'DateTimeOriginal');
            if(dt){const p=dt.split(' ');ed=p[0].replace(/:/g,'-')+(p[1]?' '+p[1]:'');}
            finishPhoto(url,type,ed,f.name);
          });
        }else{finishPhoto(url,type,null,f.name)}
      }catch(err){finishPhoto(url,type,null,f.name)}
    };
    img.src=url;
  };
  r.readAsDataURL(f);e.target.value='';
}

function finishPhoto(url,type,ed,fn){
  S.av.photos.push({id:uid(),type,dataUrl:url,exifDate:ed,uploadedAt:new Date().toLocaleString('et-EE'),fileName:fn});
  save();render();
}

function rmPhoto(id){if(!S.av)return;S.av.photos=S.av.photos.filter(p=>p.id!==id);save();render()}

function setVTab(t){S.vTab=t;render()}

function addTask(){
  const t=document.getElementById('newTask').value.trim();
  if(!t||!S.av)return;
  S.av.tasks.push({id:uid(),text:t,done:false});
  save();cm('mAddTask');document.getElementById('newTask').value='';render();
}
function toggleTask(id){if(!S.av)return;const t=S.av.tasks.find(x=>x.id===id);if(t)t.done=!t.done;save();render()}
function rmTask(id){if(!S.av)return;S.av.tasks=S.av.tasks.filter(t=>t.id!==id);save();render()}

function addOrder(){
  const prod=document.getElementById('oProd').value.trim();
  const qty=parseFloat(document.getElementById('oQty').value||0);
  const unit=document.getElementById('oUnit').value.trim()||'tk';
  const price=parseFloat(document.getElementById('oPrice').value||0);
  const notes=document.getElementById('oNotes').value.trim();
  if(!prod){alert('Sisesta toote nimi!');return}
  S.av.orders.push({id:uid(),product:prod,qty,unit,price,notes});
  save();cm('mAddOrder');['oProd','oQty','oUnit','oPrice','oNotes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});
  render();
}
function rmOrder(id){if(!S.av)return;S.av.orders=S.av.orders.filter(o=>o.id!==id);save();render()}

function selDel(s,el){
  S.delStatus=s;
  document.querySelectorAll('#delBtns .del-btn').forEach(b=>b.className='del-btn');
  const m={delivered:'s-ok',partial:'s-warn',rejected:'s-err'};
  el.classList.add(m[s]);
}

function addDelivery(){
  const prod=document.getElementById('dProd').value.trim();
  const qty=parseFloat(document.getElementById('dQty').value||0);
  const unit=document.getElementById('dUnit').value.trim()||'tk';
  const notes=document.getElementById('dNotes').value.trim();
  if(!prod){alert('Sisesta toote nimi!');return}
  S.av.deliveries.push({id:uid(),product:prod,qty,unit,status:S.delStatus,notes});
  save();cm('mAddDel');['dProd','dQty','dUnit','dNotes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});
  S.delStatus='delivered';
  const btns=document.querySelectorAll('#delBtns .del-btn');
  btns.forEach(b=>b.className='del-btn');
  if(btns[0])btns[0].classList.add('s-ok');
  render();
}
function rmDel(id){if(!S.av)return;S.av.deliveries=S.av.deliveries.filter(d=>d.id!==id);save();render()}

// ─────────────────────────── REPORT ───────────────────────────
function showReport(vid){
  const v=S.visits.find(x=>x.id===vid);if(!v)return;
  const st=gs(v.storeId);const d=dur(v.checkIn?.time,v.checkOut?.time);
  const sP={delivered:'pill-ok',partial:'pill-warn',rejected:'pill-err'};
  const sL={delivered:'Tarnitud',partial:'Osaline',rejected:'Keeldutud'};
  const bef=(v.photos||[]).filter(p=>p.type==='before');
  const aft=(v.photos||[]).filter(p=>p.type==='after');
  const total=(v.orders||[]).reduce((s,o)=>s+(parseFloat(o.price||0)*parseFloat(o.qty||0)),0);
  const tasksDone=(v.tasks||[]).filter(t=>t.done).length;

  document.getElementById('reportBody').innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div><div style="font-size:19px;font-weight:700">${esc(st?.name||'Pood')}</div><div style="font-size:12px;color:var(--t2);margin-top:2px">${fd(v.checkIn?.time)}</div></div>
      <span class="pill pill-ok">✓ Lõpetatud</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:var(--s2);border-radius:var(--rs);padding:10px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px">Check-in</div><div class="mono" style="font-size:16px">${ft(v.checkIn?.time)}</div></div>
      <div style="background:var(--s2);border-radius:var(--rs);padding:10px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px">Check-out</div><div class="mono" style="font-size:16px">${ft(v.checkOut?.time)}</div></div>
      ${d?`<div style="background:var(--ad);border-radius:var(--rs);padding:10px;grid-column:span 2"><div style="font-size:9px;color:var(--a);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px">Kestus</div><div style="font-size:16px;font-weight:600;color:var(--a)">${d}</div></div>`:''}
    </div>
    ${v.checkIn?.gps?`<div style="margin-bottom:12px"><div class="gps-tag">📍 Sisse: ${v.checkIn.gps.lat.toFixed(5)}, ${v.checkIn.gps.lng.toFixed(5)}</div> ${v.checkOut?.gps?`<span style="margin-left:6px"></span><div class="gps-tag" style="margin-top:4px">📍 Välja: ${v.checkOut.gps.lat.toFixed(5)}, ${v.checkOut.gps.lng.toFixed(5)}</div>`:''}</div>`:'' }
    ${bef.length||aft.length?`<div style="margin-bottom:14px">
      <div style="font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px">Fotod (${bef.length+aft.length})</div>
      ${bef.length?`<div style="font-size:10px;color:var(--t3);margin-bottom:4px">Enne (${bef.length}):</div><div style="display:flex;gap:5px;overflow-x:auto;padding-bottom:4px">${bef.map(p=>`<img src="${p.dataUrl}" alt="" style="width:75px;height:56px;object-fit:cover;border-radius:6px;flex-shrink:0">`).join('')}</div>`:''}
      ${aft.length?`<div style="font-size:10px;color:var(--t3);margin:6px 0 4px">Pärast (${aft.length}):</div><div style="display:flex;gap:5px;overflow-x:auto;padding-bottom:4px">${aft.map(p=>`<img src="${p.dataUrl}" alt="" style="width:75px;height:56px;object-fit:cover;border-radius:6px;flex-shrink:0">`).join('')}</div>`:''}</div>`:''}
    ${v.notes?`<div style="margin-bottom:14px"><div style="font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px">Märkmed</div><div style="font-size:13px;background:var(--s2);padding:10px;border-radius:var(--rs);line-height:1.5;color:var(--t1);white-space:pre-wrap">${esc(v.notes)}</div></div>`:''}
    ${v.tasks?.length?`<div style="margin-bottom:14px"><div style="font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px">Ülesanded (${tasksDone}/${v.tasks.length})</div>${v.tasks.map(t=>`<div style="display:flex;gap:8px;padding:5px 0;font-size:13px;border-bottom:1px solid var(--br)"><span style="color:${t.done?'var(--ok)':'var(--t3)'};font-size:12px">${t.done?'✓':'○'}</span><span style="${t.done?'text-decoration:line-through;color:var(--t3)':''}">${esc(t.text)}</span></div>`).join('')}</div>`:''}
    ${v.orders?.length?`<div style="margin-bottom:14px"><div style="font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px">Tellimused (${v.orders.length})</div>${v.orders.map(o=>`<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--br)"><span>${esc(o.product)}</span><span class="mono" style="color:var(--t2)">${o.qty} ${esc(o.unit)} ${o.price?(parseFloat(o.price)*parseFloat(o.qty)).toFixed(2)+'€':''}</span></div>`).join('')}${total>0?`<div style="display:flex;justify-content:flex-end;margin-top:6px;font-weight:600;color:var(--a);font-size:14px">Kokku: ${total.toFixed(2)}€</div>`:''}</div>`:''}
    ${v.deliveries?.length?`<div style="margin-bottom:14px"><div style="font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px">Tarne (${v.deliveries.length})</div>${v.deliveries.map(d=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:13px;border-bottom:1px solid var(--br)"><span>${esc(d.product)} · ${d.qty} ${esc(d.unit)}</span><span class="pill ${sP[d.status]||'pill-inf'}" style="font-size:10px">${sL[d.status]||esc(d.status)}</span></div>`).join('')}</div>`:''}
  `;
  om('mReport');
}

// ════════════════════════════ OFFLINE ════════════════════════════
function upd(){document.getElementById('offlineBar').classList.toggle('show',!navigator.onLine)}
window.addEventListener('online',upd);
window.addEventListener('offline',upd);
upd();

// ════════════════════════════ INIT ════════════════════════════
render();
