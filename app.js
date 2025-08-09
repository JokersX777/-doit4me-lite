const feed = [
  {text: "Porta 10 palloncini rossi a Via Roma 12 entro 30 min", price: "€16", time: "30 min"},
  {text: "Trova una torta a forma di unicorno entro le 18", price: "€28", time: "2 h"},
  {text: "Prenota un elicottero per stasera 21:00", price: "€650", time: "—"},
  {text: "Ritira e consegna pacco fragile (2 km)", price: "€12", time: "45 min"},
  {text: "Compra 3 mazzi di tulipani e consegna a sorpresa", price: "€24", time: "1 h"},
];

let currentRequest = null;
let waitTimer = null;
let eta = 20;

function $(sel){ return document.querySelector(sel); }
function show(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

function renderFeed(){
  const list = $('#feedList');
  list.innerHTML = '';
  feed.forEach(card => {
    const div = document.createElement('div');
    div.className = 'feed-card';
    div.innerHTML = `
      <div class="text">${card.text}</div>
      <div class="meta"><span>${card.price}</span><span>${card.time}</span></div>
      <button class="cta outline">FALLO ANCHE TU</button>
    `;
    div.querySelector('.cta').addEventListener('click', () => {
      $('#requestText').value = card.text;
      window.scrollTo({top:0, behavior:'smooth'});
    });
    list.appendChild(div);
  });
}

function fakeOffer(req){
  // Simple fake pricing logic
  const base = 8 + Math.random()*10;
  const rush = /30|min|entro/i.test(req) ? 1.4 : 1.0;
  const price = Math.round(base * rush);
  const mins = Math.round(20 + Math.random()*25);
  return {
    provider: ["TaskRunner Pro","FlashDeliver","Local Hero","SwiftHands"][Math.floor(Math.random()*4)],
    price: `€${price}`,
    eta: `${mins} min`,
    note: "Pagamento sicuro. Tracciamento in tempo reale."
  };
}

function startWait(){
  show('wait');
  eta = 20 + Math.floor(Math.random()*20);
  $('#etaSec').textContent = eta;
  waitTimer = setInterval(()=>{
    eta--;
    $('#etaSec').textContent = eta;
    if(eta <= 0){
      clearInterval(waitTimer);
      showOffer();
    }
  }, 1000);
}

function showOffer(){
  show('offer');
  const offer = fakeOffer(currentRequest);
  window.__offer = offer;
  $('#offerCard').innerHTML = `
    <div class="line"><strong>Servizio</strong><span>${offer.provider}</span></div>
    <div class="line"><strong>Prezzo</strong><span>${offer.price}</span></div>
    <div class="line"><strong>Tempo stimato</strong><span>${offer.eta}</span></div>
    <div class="note">${offer.note}</div>
  `;
}

function startTracking(){
  show('tracking');
  const meta = $('#trackingMeta');
  const steps = [$('#step1'), $('#step2'), $('#step3')];
  let i = 0;
  meta.textContent = `Richiesta: “${currentRequest.slice(0,80)}${currentRequest.length>80?'…':''}” • ${__offer.price} • ${__offer.provider}`;

  function advance(){
    if(i < steps.length){
      steps[i].classList.add('active');
      i++;
      if(i < steps.length){
        setTimeout(advance, 3000 + Math.random()*2000);
      }
    }
  }
  // reset steps
  steps.forEach(s => s.classList.remove('active'));
  setTimeout(advance, 800);
}

document.addEventListener('DOMContentLoaded', () => {
  renderFeed();

  $('#sendBtn').addEventListener('click', () => {
    const txt = $('#requestText').value.trim();
    if(!txt){ alert('Scrivi una richiesta.'); return; }
    currentRequest = txt;
    startWait();
  });

  $('#cancelWait').addEventListener('click', () => {
    clearInterval(waitTimer);
    show('home');
  });

  $('#declineBtn').addEventListener('click', () => show('home'));
  $('#acceptBtn').addEventListener('click', () => startTracking());
  $('#newTaskBtn').addEventListener('click', () => {
    show('home');
    document.getElementById('requestText').focus();
  });

  $('#shareBtn').addEventListener('click', () => {
    const msg = `Guarda cosa ho fatto con DoIt4Me: "${currentRequest}" — ${__offer.price} in ${__offer.eta}.`;
    if(navigator.share){
      navigator.share({title:'DoIt4Me', text: msg, url: location.href}).catch(()=>{});
    }else{
      navigator.clipboard.writeText(msg);
      alert('Copiato negli appunti! Incolla dove vuoi 💬');
    }
  });
});
