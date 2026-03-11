const intro = document.getElementById('intro');
const cinema = document.getElementById('cinema');
const line = document.getElementById('line');
const start = document.getElementById('start');
const restart = document.getElementById('restart');
const nameInput = document.getElementById('name');
const cityInput = document.getElementById('city');

let map;

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

async function run(){
  const name = (nameInput.value || 'You').trim();
  const city = (cityInput.value || 'your city').trim();
  intro.classList.add('hidden');
  cinema.classList.remove('hidden');

  const base = await geocodeCity(city);
  map = L.map('map', { zoomControl:false, attributionControl:false }).setView(base, 3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(map);

  const steps = [
    `Collecting open signals for ${name}…`,
    `Cross-referencing profiles near ${city}…`,
    `Inferring probable daily radius…`,
    `No exact address. Only approximation available.`,
    `Zooming into likely area…`,
    `Reminder: this is why privacy settings matter.`
  ];

  for (let i=0;i<steps.length;i++){
    line.textContent = steps[i];
    if(i===1) map.flyTo(base, 8, {duration:2});
    if(i===2) map.flyTo(nearby(base,12), 11, {duration:2});
    if(i===4) map.flyTo(nearby(base,3), 14, {duration:2});
    await new Promise(r=>setTimeout(r, 2200));
  }

  L.circle(nearby(base,2), { radius: 800, color:'#6ee7ff', fillOpacity:.08 }).addTo(map);
  line.textContent = 'Protect yourself: limit public data, use aliases, enable 2FA, and review data broker exposure.';
}

start.addEventListener('click', ()=>{ run().catch(err=>{ line.textContent='Error: '+err.message; }); });
restart.addEventListener('click', ()=>{ location.reload(); });
