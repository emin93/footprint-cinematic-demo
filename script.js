const intro = document.getElementById('intro');
const cinema = document.getElementById('cinema');
const line = document.getElementById('line');
const start = document.getElementById('start');
const restart = document.getElementById('restart');
const nameInput = document.getElementById('name');
const cityInput = document.getElementById('city');
const photoInput = document.getElementById('photo');
const face = document.getElementById('face');
const glitch = document.getElementById('glitch');

let map;
let audioCtx;

async function geocodeCity(city){
  const q = encodeURIComponent(city || 'Earth');
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`);
  const j = await r.json();
  if (!j?.length) return [40.4168,-3.7038];
  return [Number(j[0].lat), Number(j[0].lon)];
}

function nearby([lat,lon], km=4){
  const dLat = (Math.random()-0.5) * (km/111);
  const dLon = (Math.random()-0.5) * (km/(111*Math.cos(lat*Math.PI/180)));
  return [lat+dLat, lon+dLon];
}

function tone(freq=90, dur=0.4, gain=0.02){
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.frequency.value = freq;
  osc.type = 'sawtooth';
  g.gain.value = gain;
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start();
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  osc.stop(audioCtx.currentTime + dur);
}

function glitchPulse(){
  glitch.style.transform = 'translateX(100%)';
  setTimeout(()=>{ glitch.style.transform = 'translateX(-100%)'; }, 120);
}

async function run(){
  const name = (nameInput.value || 'You').trim();
  const city = (cityInput.value || 'your city').trim();
  intro.classList.add('hidden');
  cinema.classList.remove('hidden');

  const file = photoInput?.files?.[0];
  if(file){
    face.src = URL.createObjectURL(file);
    face.classList.remove('hidden');
  }

  const base = await geocodeCity(city);
  map = L.map('map', { zoomControl:false, attributionControl:false }).setView(base, 3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(map);

  const steps = [
    `Collecting open signals for ${name}…`,
    `Cross-referencing profiles near ${city}…`,
    `Inferring probable daily radius…`,
    `No exact address. Only approximation available.`,
    `Projecting high-probability presence zones…`,
    `Zooming into likely area…`,
    `Reminder: this is why privacy settings matter.`
  ];

  for (let i=0;i<steps.length;i++){
    line.textContent = steps[i];
    tone(80 + i*20, 0.35, 0.018);
    glitchPulse();
    if(i===1) map.flyTo(base, 8, {duration:2});
    if(i===2) map.flyTo(nearby(base,12), 11, {duration:2});
    if(i===4) map.flyTo(nearby(base,6), 13, {duration:2});
    if(i===5) map.flyTo(nearby(base,2.5), 15, {duration:2});
    await new Promise(r=>setTimeout(r, 2100));
  }

  L.circle(nearby(base,2), { radius: 800, color:'#6ee7ff', fillOpacity:.08 }).addTo(map);
  line.textContent = 'Protect yourself: limit public data, use aliases, enable 2FA, and review data broker exposure.';
}

start.addEventListener('click', ()=>{ run().catch(err=>{ line.textContent='Error: '+err.message; }); });
restart.addEventListener('click', ()=>{ location.reload(); });
