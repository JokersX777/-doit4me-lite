// v0.5.3c app.js
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const euro = n => '€'+n;
const rand = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const choice = arr => arr[Math.floor(Math.random()*arr.length)];
const NAMES = ["Sara","Marco","Giulia","Luca","Marta","Diego","Anna","Paolo","Elisa","Giorgio","Mario","Laura"];
const EMOJI = ["🎈","🍰","🚁","🌻","📦","🍕","☕","🦸‍♂️","🐧","🎥","🧁","💐"];
const TAGS = ["near","paid","urgent"];
const PLACES = ["Duomo","Navigli","Porta Nuova","Brera","Stazione Centrale","Parco Sempione","Isola"];

const TTL_MIN = 120; // Auto-expire after 120 minutes
const HOLD_SEC = 60; // Undo window

// Persistence
const LS_TASKS='d4m_tasks_v052';
const LS_STATS='d4m_stats_v052';
const LS_PROFILE='d4m_profile_v052';
const LS_FLAGS='d4m_flags_v053c';

let FEED=[]; let myTasks=[]; let waitTimer=null; let stats={done:0,total:0,level:1}; let lastOffer=null;
let flags={consent:false};

function saveTasks(){ try{ localStorage.setItem(LS_TASKS, JSON.stringify(myTasks)); }catch(e){} }
function saveStats(){ try{ localStorage.setItem(LS_STATS, JSON.stringify(stats)); }catch(e){} }
function saveProfile(){ try{ const p={ name: $('#nameDisplay').textContent, avatar: $('#avatarBtn').textContent }; localStorage.setItem(LS_PROFILE, JSON.stringify(p)); }catch(e){} }
function saveFlags(){ try{ localStorage.setItem(LS_FLAGS, JSON.stringify(flags)); }catch(e){} }
function loadPersisted(){
  try{
    const t=JSON.parse(localStorage.getItem(LS_TASKS)||'[]'); if(Array.isArray(t)){ myTasks=t; renderMyTasks(); }
    const s=JSON.parse(localStorage.getItem(LS_STATS)||'null'); if(s){ stats=s; updateStats(); }
    const p=JSON.parse(localStorage.getItem(LS_PROFILE)||'null'); if(p){ if(p.name) $('#nameDisplay').textContent=p.name; if(p.avatar) $('#avatarBtn').textContent=p.avatar; }
    const f=JSON.parse(localStorage.getItem(LS_FLAGS)||'null'); if(f){ flags=f; }
  }catch(e){}
}

function maskAddress(text){
  // Basic masking: hide numbers and exact street; keep hint
  if(!text) return "Dettagli incarico nascosti — visibili dopo l'accettazione";
  let masked = text.replace(/[0-9]{1,4}/g, "••");
  masked = masked.replace(/(Via|Viale|Vicolo|Corso|Piazza) [A-Za-zÀ-ÿ'’\s]+/gi, "$1 zona");
  return masked + "  🔒 (indirizzo nascosto)";
}

function makeTask(id){
  const price = choice([12,14,16,18,20,24,28,30,35,40,50,75]);
  const tag = choice(TAGS);
  const text = choice([
    "Porta 10 palloncini rossi a Via Roma 12 entro 30 min",
    "Ritira e consegna pacco fragile (2 km) da Via Torino 5",
    "Compra 3 mazzi di girasoli e consegna a sorpresa in Piazza Duomo",
    "Ordina e consegna 3 pizze con ananas in Corso Buenos Aires",
    "Portami un caffè da Starbucks vestito da supereroe (Brera)",
    "Registra un video ballando al "+choice(PLACES),
  ]);
  const name = choice(NAMES);
  const time = tag==='urgent' ? '30 min' : choice(['45 min','1 h','2 h','—']);
  const dist = choice([0.6, 1.2, 2.5, 3.8]).toFixed(1);
  const area = choice(["Duomo","Brera","Navigli","Isola"]) + ", Milano";
  const createdAt = Date.now() - rand(0, 90)*60*1000; // some already old
  return { id, name, price, time, tag, dist, emoji: choice(EMOJI), text, textMasked: maskAddress(text), area, assigned:false, createdAt, expired:false };
}

function isExpired(card){
  return (Date.now() - card.createdAt) > TTL_MIN*60*1000;
}

function timeLeft(card){
  const leftMs = card.createdAt + TTL_MIN*60*1000 - Date.now();
  const m = Math.max(0, Math.floor(leftMs/60000));
  return m;
}

function renderFeed(items){
  const el=$('#feed'); el.innerHTML='';
  items.forEach(card=> el.appendChild(feedCard(card)));
}

function feedCard(card){
  const div=document.createElement('div');
  div.className='feed-card';
  const expired = isExpired(card);
  const badge = expired ? `<div class="feed-badge">Scaduto</div>` : `<div class="feed-badge">Scade tra ~${timeLeft(card)} min</div>`;
  const disabled = (card.assigned || expired) ? 'disabled' : '';
  const acceptLabel = card.assigned ? 'Assegnato' : (expired ? 'Non disponibile' : 'Accetta incarico');
  div.innerHTML = `
    <div class="feed-head">
      <div class="avatar">${card.emoji}</div>
      <div class="feed-user">
        <div class="name">${card.name}</div>
        <div class="meta">${card.area} • ${card.dist} km • ${card.tag.toUpperCase()}</div>
      </div>
    </div>
    <div class="feed-media">${card.emoji}</div>
    <div class="feed-body">
      <div class="feed-title">${card.textMasked}</div>
      ${badge}
      <div class="feed-meta"><span>${euro(card.price)}</span><span>${card.time}</span></div>
      <div class="feed-actions">
        <button class="outline small act-accept" data-id="${card.id}" type="button" ${disabled}>${acceptLabel}</button>
        <button class="ghost small act-copy" data-text="${card.text}" type="button">Chiedi anche tu</button>
        <button class="ghost small act-report" data-id="${card.id}" type="button">Segnala</button>
      </div>
    </div>`;
  div.querySelector('.act-copy').addEventListener('click',(e)=>{
    $('#reqText').value=e.target.dataset.text; show('tasks'); $('#reqText').focus();
  });
  div.querySelector('.act-report').addEventListener('click',()=>{
    const reason = prompt('Perché segnali questo task? es. spam, vietato, truffa');
    showToast( reason ? 'Segnalazione inviata. Grazie.' : 'Segnalazione annullata.');
  });
  const acceptBtn = div.querySelector('.act-accept');
  acceptBtn && acceptBtn.addEventListener('click',()=>{
    if(card.assigned || isExpired(card)) return;
    // first-time lightweight consent
    if(!flags.consent){
      openRunnerConsent(()=> confirmAccept(card, div));
    } else {
      confirmAccept(card, div);
    }
  });
  return div;
}

function openRunnerConsent(cb){
  openModal('modalRunner');
  const ok = ()=>{
    if(!$('#runnerConsent').checked){ showToast('Spunta "Ho capito e accetto" per continuare.'); return; }
    flags.consent = true; saveFlags();
    closeModal('modalRunner');
    cb && cb();
  };
  $('#runnerOk').onclick = ok;
  $('#runnerCancel').onclick = ()=> closeModal('modalRunner');
}

function confirmAccept(card, div){
  const proceed = confirm('Accetti questo incarico? Puoi annullare entro 60 secondi.');
  if(!proceed) return;
  card.assigned = true;
  const btn = div.querySelector('.act-accept'); btn.textContent='Assegnato'; btn.disabled=true;
  acceptFromFeed(card, true);
}

function applyFilter(type){
  let items=FEED.slice();
  switch(type){
    case 'available': items = items.filter(x=>!x.assigned && !isExpired(x)); break;
    case 'assigned': items = items.filter(x=>x.assigned); break;
    case 'near': items = items.filter(x=>parseFloat(x.dist)<=1.5); break;
    case 'paid': items = items.sort((a,b)=>b.price-a.price); break;
    case 'urgent': items = items.filter(x=>x.tag==='urgent'); break;
    default: items = items.filter(x=>!isExpired(x)); break;
  }
  renderFeed(items);
}

function addMoreToFeed(n=5){
  const startId=FEED.length+1;
  for(let i=0;i<n;i++) FEED.push(makeTask(startId+i));
  const el=$('#feed');
  for(let i=FEED.length-n;i<FEED.length;i++) el.appendChild(feedCard(FEED[i]));
}

// My tasks
function addMyTask(text){
  const task={ id:Date.now(), text, status:'pending', price:null, provider:null };
  myTasks.unshift(task); renderMyTasks(); return task;
}
function renderMyTasks(){
  const wrap=$('#myTasks'); wrap.classList.remove('empty');
  if(myTasks.length===0){ wrap.classList.add('empty'); wrap.innerHTML='<div class="empty-state">Nessun task ancora. Crea una richiesta con il pulsante qui sopra.</div>'; return; }
  wrap.innerHTML = myTasks.map(t=>`
    <div class="card">
      <div><strong>${t.text}</strong></div>
      <div class="feed-meta">
        <span>${t.status==='pending'?'In attesa di offerta':''}${t.status==='accepted'?'Accettato':''}${t.status==='inprogress'?'In corso':''}${t.status==='done'?'Completato':''}</span>
        <span>${t.price? euro(t.price):''} ${t.provider? '• '+t.provider:''}</span>
      </div>
    </div>
  `).join('');
  saveTasks();
}

// Modals
function openModal(id){ $('#'+id).classList.add('show'); }
function closeModal(id){ $('#'+id).classList.remove('show'); }

function fakeOffer(reqText){
  const base=8+Math.random()*12;
  const rush=/30|min|entro/i.test(reqText)?1.4:1.0;
  const price=Math.round(base*rush);
  const mins=Math.round(15+Math.random()*20);
  return { provider: choice(["TaskRunner Pro","FlashDeliver","Local Hero","SwiftHands"]), price, eta: `${mins} min` };
}

function startWait(reqTask){
  openModal('modalWait');
  let eta = 10 + Math.floor(Math.random()*8);
  $('#waitSec').textContent = eta;
  waitTimer = setInterval(()=>{
    eta--;
    $('#waitSec').textContent = eta;
    if(eta<=0){
      clearInterval(waitTimer);
      closeModal('modalWait');
      const offer=fakeOffer(reqTask.text); lastOffer=offer;
      $('#offerCard').innerHTML = `
        <div>Servizio</div><div>${offer.provider}</div>
        <div>Prezzo</div><div>${euro(offer.price)}</div>
        <div>Tempo stimato</div><div>${offer.eta}</div>
        <div style="grid-column:1/-1;color:#94a3b8;font-size:12px">Pagamento sicuro. Tracciamento in tempo reale.</div>`;
      openModal('modalOffer');
    }
  },1000);
}

// Tracking + 60s hold undo
let holdTimer = null; let holdLeft = 0; let holdTask = null; let holdCardRef = null;
function startHold(){
  holdLeft = HOLD_SEC;
  $('#holdHint').style.display='block';
  $('#cancelTask').style.display='inline-block';
  $('#holdSec').textContent = holdLeft;
  if(holdTimer) clearInterval(holdTimer);
  holdTimer = setInterval(()=>{
    holdLeft--; $('#holdSec').textContent = holdLeft;
    if(holdLeft<=0){ clearInterval(holdTimer); $('#holdHint').style.display='none'; $('#cancelTask').style.display='none'; }
  },1000);
}

function cancelWithinHold(){
  if(!holdTask) return;
  // Revert assignment
  if(holdCardRef){ holdCardRef.assigned=false; }
  showToast('Incarico annullato senza penali.'); closeModal('modalTrack');
  holdTask.status='canceled'; renderMyTasks();
  holdTask = null; holdCardRef = null;
  $('#holdHint').style.display='none'; $('#cancelTask').style.display='none';
  if(holdTimer) clearInterval(holdTimer);
  applyFilter($('.chip.active')?.dataset.filter || 'all');
}

function startTracking(task){
  closeModal('modalOffer'); openModal('modalTrack');
  task.status='inprogress'; task.price=lastOffer.price; task.provider=lastOffer.provider; renderMyTasks();
  const steps=[$('#st1'),$('#st2'),$('#st3')]; steps.forEach(s=>s.classList.remove('active'));
  $('#trackMeta').textContent = `Richiesta: "${task.text}" • ${euro(task.price)} • ${task.provider}`;
  let i=0; function advance(){ if(i<steps.length){ steps[i].classList.add('active'); i++; if(i<steps.length) setTimeout(advance, 2200 + Math.random()*1500); else { task.status='done'; stats.done += 1; stats.total += task.price; updateStats(); showToast("✅ Compito completato! Lascia una recensione ⭐⭐⭐⭐⭐"); } } }
  setTimeout(advance, 500);
}

function acceptFromFeed(card, fromConfirm){
  showToast("Hai accettato l'incarico ✔️");
  lastOffer = { provider: "Tu (Runner)", price: card.price, eta: card.time };
  const t = { id:Date.now(), text: card.text+" — (dal feed)", status:'accepted', price: card.price, provider:"Tu (Runner)" };
  myTasks.unshift(t); renderMyTasks();
  openModal('modalTrack');
  $('#trackMeta').textContent = `Incarico: "${card.text}" • ${euro(card.price)} • Assegnato a te`;
  // Enable hold undo for 60s
  holdTask = t; holdCardRef = card; startHold();
  const steps=[$('#st1'),$('#st2'),$('#st3')]; steps.forEach(s=>s.classList.remove('active'));
  let i=0; function advance(){ if(i<steps.length){ steps[i].classList.add('active'); i++; if(i<steps.length) setTimeout(advance, 2200 + Math.random()*1500); else { t.status='done'; stats.done += 1; stats.total += t.price; updateStats(); showToast("✅ Incarico completato!"); } } }
  setTimeout(advance, 500);
}

// Chat
function openChat(){
  $('#chatLog').innerHTML = `
    <div class="msg"><div class="bubble">Ciao! Sto partendo adesso 👍</div></div>
    <div class="msg me"><div class="bubble">Perfetto, ti aspetto davanti al civico 12.</div></div>`;
  openModal('modalChat');
  setTimeout(()=> appendChat("Arrivo in 10 minuti ⏱️"), 1200);
}
function appendChat(text, me=false){
  const row=document.createElement('div'); row.className='msg'+(me?' me':'');
  row.innerHTML = `<div class="bubble">${text}</div>`;
  $('#chatLog').appendChild(row); $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
}

// Toasts
function showToast(msg){ const t=document.createElement('div'); t.className='toast'; t.textContent=msg; $('#toasts').appendChild(t); setTimeout(()=>t.remove(), 4200); }
function periodicToasts(){
  const msgs=["📍 Nuova richiesta a 1,2 km: Consegna fiori • €18","🚀 Mario ha accettato il tuo compito!","💬 Hai un nuovo messaggio nella chat","⭐ Hai guadagnato il badge: Affidabile"];
  setInterval(()=> showToast(choice(msgs)), 15000);
}

// Stats
function updateStats(){ $('#statTasks').textContent=stats.done; $('#statEarn').textContent=euro(stats.total); $('#statLvl').textContent=1 + Math.floor(stats.done/5); saveStats(); }

// Price Suggestion
function suggestPrice(){
  const type = $('#typeSeg .seg.on').dataset.type;
  const urg  = $('#reqUrgency').value;
  const etaT = ($('#reqEta').value||'').toLowerCase();
  const isRush = urg==='now' || /min|30|subito|ora/.test(etaT);
  let price = 10;
  if(type==='physical'){
    const r = parseFloat(($('#reqRadius').value||'0').replace(',','.')) || 0;
    price = Math.max(8, Math.round(6 + 1.5*r + (isRush?4:0)));
  } else {
    price = Math.round(12 + (isRush?6:0));
  }
  $('#suggestVal').textContent = '€'+price;
  $('#suggestWrap').classList.remove('hide');
  return price;
}
function wireSuggest(){
  ['input','change','keyup'].forEach(ev=>{
    ['#reqRadius','#reqUrgency','#reqEta','#typeSeg'].forEach(sel=>{
      const el = (sel==='#typeSeg')? $('#typeSeg') : $(sel);
      el && el.addEventListener(ev, ()=> suggestPrice());
    });
  });
  $('#useSuggest').addEventListener('click', ()=>{
    const p = suggestPrice(); $('#reqBudget').value = '€'+p;
  });
}

// UI helpers
function show(tab){ $$('.screen').forEach(x=>x.classList.remove('active')); $('#'+tab).classList.add('active'); $$('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab)); window.scrollTo({top:0, behavior:'smooth'}); }

// Init
document.addEventListener('DOMContentLoaded', ()=>{
  loadPersisted();

  // Tabs
  $$('.tab').forEach(b=> b.addEventListener('click', ()=> show(b.dataset.tab)));

  // Filters
  $$('.chip').forEach(c=> c.addEventListener('click', ()=>{ $$('.chip').forEach(x=>x.classList.remove('active')); c.classList.add('active'); applyFilter(c.dataset.filter);} ));

  // Feed
  FEED = Array.from({length:12}, (_,i)=>makeTask(i+1));
  renderFeed(FEED);
  $('#loadMore').addEventListener('click', ()=> addMoreToFeed(6));
  setInterval(()=> addMoreToFeed(1), 8000);

  // Segmented controls
  function wireSegmented(id, cb){
    const seg = $(id);
    ['click','touchstart'].forEach(evt=> seg.addEventListener(evt, (e)=>{
      const t = e.target.closest('.seg'); if(!t) return;
      seg.querySelectorAll('.seg').forEach(s=>s.classList.remove('on'));
      t.classList.add('on'); cb && cb(t.dataset);
      e.preventDefault();
    }), {passive:false});
  }
  wireSegmented('#typeSeg', ds=>{
    if(ds.type==='physical'){ $('#physicalFields').classList.remove('hidden'); $('#digitalFields').classList.add('hidden'); }
    else { $('#digitalFields').classList.remove('hidden'); $('#physicalFields').classList.add('hidden'); }
    suggestPrice();
  });
  wireSegmented('#modeSeg');

  // Templates
  document.querySelectorAll('[data-tpl]').forEach(b=> b.addEventListener('click', ()=>{
    const t=b.dataset.tpl;
    if(t==='delivery'){ $('#typeSeg .seg[data-type="physical"]').click(); $('#reqText').value='Ritira e consegna pacco fragile (2 km)'; $('#reqEta').value='entro 45 min'; $('#reqBudget').value='€12'; $('#reqArea').value='Duomo, Milano'; $('#reqRadius').value='3'; $('#reqSlot').value='15:00–17:00'; }
    else if(t==='buy'){ $('#typeSeg .seg[data-type="physical"]').click(); $('#reqText').value='Compra 3 mazzi di tulipani e consegna a sorpresa'; $('#reqEta').value='1 h'; $('#reqBudget').value='€18'; $('#reqArea').value='Duomo, Milano'; $('#reqRadius').value='2'; $('#reqSlot').value='18:00–20:00'; }
    else if(t==='digital'){ $('#typeSeg .seg[data-type="digital"]').click(); $('#reqText').value='Impagina un volantino A5 fronte/retro'; $('#reqEta').value='oggi'; $('#reqBudget').value='€25'; $('#reqGoal').value='Testo + immagini già pronti'; $('#reqFormat').value='PDF + PNG 1080x1080'; }
    else { $('#reqText').value='Porta 10 palloncini rossi a Via Roma 12 entro 30 min'; $('#reqEta').value='30 min'; $('#reqBudget').value='€16'; }
    suggestPrice();
  }));

  // Create request
  $('#send').addEventListener('click', ()=>{
    const text = $('#reqText').value.trim();
    if(!text){ alert('Scrivi la descrizione della richiesta.'); return; }
    const t = addMyTask(text);
    showToast("Richiesta inviata. Stiamo cercando chi può farla…");
    startWait(t);
  });

  // Offer/track/chat
  $('#cancelWait').addEventListener('click', ()=>{ clearInterval(waitTimer); closeModal('modalWait'); });
  $('#decline').addEventListener('click', ()=> closeModal('modalOffer'));
  $('#accept').addEventListener('click', ()=>{ const current=myTasks[0]; if(current){ current.status='accepted'; renderMyTasks(); startTracking(current); } });
  $('#closeTrack').addEventListener('click', ()=> closeModal('modalTrack'));
  $('#openChat').addEventListener('click', ()=> openChat());
  $('#closeChat').addEventListener('click', ()=> closeModal('modalChat'));
  $('#chatSend').addEventListener('click', ()=>{ const val=$('#chatText').value.trim(); if(!val) return; appendChat(val, true); $('#chatText').value=''; setTimeout(()=>appendChat('Ricevuto 👍'), 900); });
  $('#cancelTask').addEventListener('click', cancelWithinHold);

  // Rating
  $$('#rateStars .star').forEach((btn, idx)=> btn.addEventListener('click', ()=>{
    const val=idx+1; $('#rateStars').dataset.val=val; $$('#rateStars .star').forEach((b,i)=> b.classList.toggle('on', i<val));
  }));
  $('#sendRate').addEventListener('click', ()=>{ const stars=parseInt($('#rateStars').dataset.val||'5',10); const txt=$('#rateText').value.trim(); closeModal('modalRate'); showToast('Grazie per la recensione '+ '★'.repeat(stars)); if(txt) showToast('“'+txt+'”'); });
  $('#addTip').addEventListener('click', ()=>{ const tip=prompt('Quanto vuoi lasciare di mancia? es. 2'); if(!tip) return; const n=parseFloat(tip.replace(',','.')); if(!isNaN(n)&&n>0){ stats.total += n; updateStats(); showToast('🙏 Mancia aggiunta: €'+n.toFixed(2)); } });

  // Profile edit
  const AVA=["🧑‍💼","🧑‍🍳","🧑‍🚴","🧑‍💻","🧑‍🎨","🧑‍🔧","🧑‍🌾","🧑‍🚒","🧑‍🏫","🧑‍🚀"];
  $('#avatarBtn').addEventListener('click', ()=>{
    const cur=$('#avatarBtn').textContent; const idx=(AVA.indexOf(cur)+1)%AVA.length; $('#avatarBtn').textContent=AVA[idx]; saveProfile();
  });
  $('#editName').addEventListener('click', ()=>{
    const cur=$('#nameDisplay').textContent; const nv=prompt('Il tuo nome visualizzato:', cur); if(!nv) return;
    $('#nameDisplay').textContent = nv.trim().slice(0,30) || cur; saveProfile();
  });

  // Price suggestion wiring
  wireSuggest(); suggestPrice();

  // Periodic toasts + stats
  periodicToasts(); updateStats();

  // Initial filter apply to remove expired from default "Tutti"
  applyFilter('all');
});
