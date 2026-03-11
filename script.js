const c = document.getElementById('k');
const ctx = c.getContext('2d');
const ui = document.getElementById('ui');
const startBtn = document.getElementById('start');

let w = c.width = innerWidth;
let h = c.height = innerHeight;
addEventListener('resize', () => { w = c.width = innerWidth; h = c.height = innerHeight; });

let t = 0;
let running = false;
let startAt = 0;
let audioCtx, src, gain, filter, shaper;
let fxGain, fxFilter;
let mantraTimer;
let mantraSpeaking = false;
const finale = document.getElementById('finale');

const mantras = [
  'Amen.',
  'Relax.',
  'Breathe in. Breathe out.',
  'You are safe.',
  'AI will not take over the world.',
  'Peace in. Fear out.',
  'Amen. Relax. AI will not take over the world.',
];

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function easeInExpo(x){ return x === 0 ? 0 : Math.pow(2, 10 * x - 10); }

function makeDistortion(amount=80){
  const n = 44100;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for(let i=0;i<n;i++){
    const x = (i*2)/n - 1;
    curve[i] = ((3+amount)*x*20*deg) / (Math.PI + amount*Math.abs(x));
  }
  return curve;
}

async function setupAudio(){
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const res = await fetch('assets/sfx.wav');
  const arr = await res.arrayBuffer();
  const buf = await audioCtx.decodeAudioData(arr);

  src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  gain = audioCtx.createGain();
  gain.gain.value = 0.06;

  filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 420;
  filter.Q.value = 0.7;

  shaper = audioCtx.createWaveShaper();
  shaper.curve = makeDistortion(30);
  shaper.oversample = '4x';

  src.connect(filter);
  filter.connect(shaper);
  shaper.connect(gain);
  gain.connect(audioCtx.destination);

  // extra oscillator layer, intentionally quieter than voice mantra
  fxGain = audioCtx.createGain();
  fxGain.gain.value = 0.004;
  fxFilter = audioCtx.createBiquadFilter();
  fxFilter.type = 'highpass';
  fxFilter.frequency.value = 140;
  fxFilter.Q.value = 0.9;
  fxFilter.connect(fxGain);
  fxGain.connect(audioCtx.destination);

  src.start();
}

function speakMantra(progress){
  const synth = window.speechSynthesis;
  if(!synth || mantraSpeaking) return;
  const e = easeInExpo(clamp(progress, 0, 1));
  const phrase = mantras[Math.floor(Math.random()*mantras.length)];

  const u = new SpeechSynthesisUtterance(phrase);
  u.rate = 0.68 + e*1.35;
  u.pitch = 0.85 + e*0.55;
  u.volume = 0.72;
  mantraSpeaking = true;
  u.onend = () => { mantraSpeaking = false; };
  u.onerror = () => { mantraSpeaking = false; };
  synth.speak(u);
}

function scheduleMantras(){
  const loop = () => {
    if(!running) return;
    const progress = (performance.now() - startAt) / 28000;
    speakMantra(progress);

    const e = easeInExpo(clamp(progress, 0, 1));
    const nextMs = Math.max(420, 2300 - e*1750);
    mantraTimer = setTimeout(loop, nextMs);
  };
  loop();
}

function funkyPing(progress){
  if(!audioCtx || !fxFilter || !fxGain) return;
  const e = easeInExpo(clamp(progress, 0, 1));
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  const f = 120 + Math.random()*280 + e*1200;
  o.frequency.value = f;
  o.type = Math.random() > 0.5 ? 'triangle' : 'sawtooth';
  g.gain.value = 0.0008 + e*0.01; // quieter than mantra + voice loop

  o.connect(fxFilter);
  fxFilter.connect(g);
  g.connect(audioCtx.destination);

  const dur = 0.03 + (1-e)*0.08;
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  o.stop(audioCtx.currentTime + dur);

  fxFilter.frequency.value = 120 + e*4800;
  fxFilter.Q.value = 0.8 + e*6;
}

function draw(progress){
  const p = clamp(progress, 0, 1);
  const e = easeInExpo(p);

  const speed = 0.001 + e * 0.05;
  const petals = 6 + Math.floor(e * 20);
  const jitter = e * 34;
  const chaos = e * 0.12;

  t += speed * 16;

  ctx.fillStyle = `rgba(0,0,0,${0.15 + e*0.45})`;
  ctx.fillRect(0,0,w,h);

  ctx.save();
  ctx.translate(w/2, h/2);

  for(let i=0;i<petals;i++){
    ctx.save();
    const a = (Math.PI*2/petals)*i + t*0.22;
    ctx.rotate(a);

    for(let r=0;r<Math.min(w,h)*0.75;r+=9){
      const n = Math.sin(r*0.045 + t*7 + i*0.8);
      const x = r + n*16 + (Math.random()-0.5)*jitter;
      const y = Math.sin(r*0.025 + t*9)*36 + (Math.random()-0.5)*jitter;

      const hue = (r*0.3 + t*260 + i*18) % 360;
      const sat = 72 + e*28;
      const light = 30 + 38*Math.sin(t*3.4 + r*0.012);
      ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${0.08 + e*0.36})`;

      const size = 5 + 14*Math.abs(Math.sin(t*2.4 + r*0.034)) + e*22;
      ctx.beginPath();
      ctx.ellipse(x*(1+chaos), y*(1+chaos), size, size*(0.48+Math.abs(n)), a+t, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();

  if (e > 0.9){
    ctx.fillStyle = `rgba(255,255,255,${(e-0.9)*3.8})`;
    ctx.fillRect(0,0,w,h);
  }
}

function tick(now){
  if(!running) return;
  const progress = (now - startAt) / 28000;

  if (audioCtx && src){
    const e = easeInExpo(clamp(progress,0,1));
    src.playbackRate.value = 0.5 + e*2.9;
    gain.gain.value = 0.06 + e*0.2;
    filter.frequency.value = 240 + e*3600;
    filter.Q.value = 0.7 + e*11;
    shaper.curve = makeDistortion(24 + e*620);

    if (Math.random() < (0.08 + e*0.24)) funkyPing(progress);
  }

  draw(progress);

  if(progress >= 1.07){
    running = false;
    if (mantraTimer) clearTimeout(mantraTimer);
    if (finale) {
      finale.classList.remove('hidden');
      finale.classList.add('show');
    }
    return;
  }
  requestAnimationFrame(tick);
}

startBtn.addEventListener('click', async () => {
  ui.classList.add('hidden');
  if (finale) {
    finale.onerror = () => finale.classList.add('hidden');
    finale.classList.remove('show');
    finale.classList.add('hidden');
  }
  await setupAudio();
  running = true;
  startAt = performance.now();
  scheduleMantras();
  requestAnimationFrame(tick);
});
