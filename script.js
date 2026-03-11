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
  gain.gain.value = 0.02;

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

  src.start();
}

function draw(progress){
  const p = clamp(progress, 0, 1);
  const e = easeInExpo(p);

  const speed = 0.001 + e * 0.04;
  const petals = 6 + Math.floor(e * 18);
  const jitter = e * 28;
  const chaos = e * 0.08;

  t += speed * 16;

  ctx.fillStyle = `rgba(0,0,0,${0.15 + e*0.35})`;
  ctx.fillRect(0,0,w,h);

  ctx.save();
  ctx.translate(w/2, h/2);

  for(let i=0;i<petals;i++){
    ctx.save();
    const a = (Math.PI*2/petals)*i + t*0.2;
    ctx.rotate(a);

    for(let r=0;r<Math.min(w,h)*0.7;r+=10){
      const n = Math.sin(r*0.04 + t*6 + i*0.7);
      const x = r + n*14 + (Math.random()-0.5)*jitter;
      const y = Math.sin(r*0.02 + t*8)*30 + (Math.random()-0.5)*jitter;

      const hue = (r*0.25 + t*220 + i*15) % 360;
      const sat = 70 + e*30;
      const light = 35 + 30*Math.sin(t*3 + r*0.01);
      ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${0.08 + e*0.32})`;

      const size = 6 + 12*Math.abs(Math.sin(t*2 + r*0.03)) + e*18;
      ctx.beginPath();
      ctx.ellipse(x*(1+chaos), y*(1+chaos), size, size*(0.5+Math.abs(n)), a+t, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();

  if (e > 0.92){
    ctx.fillStyle = `rgba(255,255,255,${(e-0.92)*3.2})`;
    ctx.fillRect(0,0,w,h);
  }
}

function tick(now){
  if(!running) return;
  const progress = (now - startAt) / 28000; // 28 sec build-up

  if (audioCtx && src){
    const e = easeInExpo(clamp(progress,0,1));
    src.playbackRate.value = 0.55 + e*2.6;
    gain.gain.value = 0.015 + e*0.12;
    filter.frequency.value = 260 + e*3200;
    filter.Q.value = 0.7 + e*9;
    shaper.curve = makeDistortion(20 + e*520);
  }

  draw(progress);

  if(progress >= 1.05){
    running = false;
    return;
  }
  requestAnimationFrame(tick);
}

startBtn.addEventListener('click', async () => {
  ui.classList.add('hidden');
  await setupAudio();
  running = true;
  startAt = performance.now();
  requestAnimationFrame(tick);
});
