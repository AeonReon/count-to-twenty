/* Count to Twenty — shared engine
 * Pre-generated MP3 audio only. Light/bright palette. Numeral always hero.
 * Each game must call: const audio = new GameAudio({base:'../audio/'});
 * Then on Start handler: audio.unlock() as FIRST line, before any await.
 */

const NUM_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten',
  'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];

const VOICE_A = {
  correct: ['amazing','brilliant','fantastic','i-knew-you-could-do-it','incredible','perfect','superstar','thats-right','well-done','wow-look-at-you-go','yes-youre-so-clever','you-got-it','youre-on-fire'],
  wrong: ['almost-have-another-go','dont-worry-try-again','keep-trying-youre-so-close','nearly-give-it-another-go','not-quite-you-can-do-it','oops-not-that-one'],
  'round-complete': ['brilliant-round-keep-going','round-complete-amazing','round-done-youre-doing-so-well','you-did-it-on-to-the-next'],
  'game-complete': ['what-a-fantastic-player','you-are-a-superstar','you-did-the-whole-thing','you-finished-so-proud','youre-incredible-we-did-it'],
  greetings: ['are-you-ready','are-you-watching','come-on-lets-play','here-we-go','lets-go','pay-attention-now','this-is-going-to-be-fun']
};

class GameAudio {
  constructor(opts){
    this.base = (opts && opts.base) || 'audio/';
    this.ctx = null; this.musicGain = null; this.sfxGain = null;
    this.musicVol = 0.10; this.musicDucked = 0.025;
    this.speaking = false; this.queue = []; this._last = {};
    this._unlocked = false;
    this._htmlPrimed = false;
  }
  _init(){
    if(this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const m = this.ctx.createGain(); m.gain.value = 1; m.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicVol; this.musicGain.connect(m);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.7; this.sfxGain.connect(m);
  }
  unlock(){
    this._init();
    if(this.ctx.state === 'suspended') this.ctx.resume().catch(()=>{});
    // iOS gesture-bind: play a silent one-sample buffer inside the user gesture
    try {
      const buf = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buf; src.connect(this.ctx.destination); src.start(0);
    } catch(e){}
    // Prime an HTML <audio> element too (fallback path needs gesture unlock on iOS PWA)
    if(!this._htmlPrimed){
      this._htmlPrimed = true;
      try {
        const a = new Audio();
        a.src = 'data:audio/mp3;base64,SUQzAwAAAAAAClRTU0UAAAAGAAADbnVsbAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        a.volume = 0; a.play().then(() => a.pause()).catch(() => {});
      } catch(e){}
    }
    this._unlocked = true;
  }
  tone(type){
    this._init();
    const c = this.ctx, n = c.currentTime;
    const f = {
      correct:[523.25,659.25,783.99],
      wrong:[392,349.23],
      pop:[880,1175,659.25],
      whoosh:[1046.5],
      blast:[220,330,440,660,880],
      sparkle:[1318.5,1568,1760,2093],
      gulp:[660,440,330],
      ding:[1318.5,1760]
    }[type] || [440];
    f.forEach((hz,i)=>{
      const o = c.createOscillator(), g = c.createGain();
      o.type = (type==='pop'||type==='blast')?'square':'sine';
      o.frequency.value = hz;
      g.gain.setValueAtTime(0.0001, n + i*0.05);
      g.gain.exponentialRampToValueAtTime(type==='pop'?0.18:0.14, n + i*0.05 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, n + i*0.05 + 0.22);
      o.connect(g); g.connect(this.sfxGain);
      o.start(n + i*0.05); o.stop(n + i*0.05 + 0.3);
    });
  }
  _duck(){
    if(!this.musicGain) return;
    const n = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(n);
    this.musicGain.gain.linearRampToValueAtTime(this.musicDucked, n + 0.1);
  }
  _unduck(){
    if(!this.musicGain) return;
    const n = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(n);
    this.musicGain.gain.linearRampToValueAtTime(this.musicVol, n + 0.3);
  }
  _playFile(path){
    const fb = () => new Promise(r => {
      const a = new Audio(path);
      a.volume = 1;
      a.onended = r; a.onerror = () => r();
      a.play().catch(() => r());
    });
    if(this.ctx && this.ctx.state !== 'closed'){
      return fetch(path)
        .then(r => { if(!r.ok) throw 0; return r.arrayBuffer(); })
        .then(b => this.ctx.decodeAudioData(b))
        .then(buf => new Promise(r => {
          const s = this.ctx.createBufferSource();
          s.buffer = buf; s.connect(this.ctx.destination);
          let done = false;
          const finish = () => { if(done) return; done = true; r(); };
          s.onended = finish;
          s.start();
          // Watchdog: if onended doesn't fire, resolve so the queue doesn't stall
          setTimeout(finish, (buf.duration * 1000) + 800);
        }))
        .catch(() => fb());
    }
    return fb();
  }
  speak(path){
    const job = { path, resolve: null };
    const p = new Promise(r => job.resolve = r);
    this.queue.push(job);
    this._drain();
    return p;
  }
  async _drain(){
    if(this.speaking) return;
    this.speaking = true;
    while(this.queue.length){
      const j = this.queue.shift();
      this._duck();
      try { await this._playFile(j.path); } catch(e) {}
      j.resolve();
      this._unduck();
    }
    this.speaking = false;
  }
  clearQueue(){
    this.queue.forEach(j => j.resolve());
    this.queue = [];
  }
  // Speak a digit (0-20) using the pre-recorded mp3
  speakNumber(n){
    return this.speak(this.base + 'numbers/' + n + '.mp3');
  }
  // Speak a phrase from /audio/phrases/
  speakPhrase(name){
    return this.speak(this.base + 'phrases/' + name + '.mp3');
  }
  // Pick a random non-repeating clip from a Voice-A category
  speakCategory(cat){
    const arr = VOICE_A[cat] || [];
    if(!arr.length) return Promise.resolve();
    const filtered = arr.filter(k => k !== this._last[cat]);
    const pool = filtered.length ? filtered : arr;
    const pick = pool[Math.floor(Math.random()*pool.length)];
    this._last[cat] = pick;
    return this.speak(this.base + 'voice-a/' + cat + '/' + pick + '.mp3');
  }
  startMusic(){
    this._init();
    const begin = () => {
      if(!this.musicGain) return;
      const scale = [440.00, 493.88, 523.25, 587.33, 659.25, 783.99, 880.00];
      let t = this.ctx.currentTime + 0.2;
      const step = () => {
        if(!this.musicGain) return;
        const f = scale[Math.floor(Math.random()*scale.length)];
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.7, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        o.connect(g); g.connect(this.musicGain);
        o.start(t); o.stop(t + 0.55);
        t += 0.4;
        if(this.musicGain) setTimeout(step, 380);
      };
      step();
    };
    // Only start scheduling oscillators once the context is actually running
    if(this.ctx.state === 'running') begin();
    else this.ctx.resume().then(begin).catch(() => {});
  }
}

/* ═══ Helpers ═══ */
const $ = id => document.getElementById(id);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const shuffle = arr => {
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function onTap(el, fn){
  // touchstart fires immediately on touch — iOS uses this as the
  // user-gesture context for unlocking the AudioContext. touchend is too late.
  let t = false;
  el.addEventListener('touchstart', e => {
    e.preventDefault();
    if(t) return;
    t = true;
    fn(e);
    setTimeout(() => t = false, 300);
  }, { passive: false });
  el.addEventListener('click', e => {
    if(t) return;
    fn(e);
  });
}
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  // Home bubble removed — the top-left ← Home link is the only exit (kept off the play area).
  const bub = $('homeBubble');
  if(bub) bub.style.display = 'none';
}
function showBanner(text, sub){
  const b = $('banner');
  if(!b) return;
  b.innerHTML = text + (sub ? `<div class="banner-sub">${sub}</div>` : '');
  b.classList.remove('show'); void b.offsetWidth;
  b.classList.add('show');
}

/* ═══ Confetti ═══ */
let _fxCanvas, _fxCtx, _confetti = [];
const _CONF_COLORS = ['#fbbf24','#ec4899','#3b82f6','#22c55e','#ef4444','#a855f7','#10b981'];
function _resizeFx(){
  if(!_fxCanvas) return;
  _fxCanvas.width = innerWidth; _fxCanvas.height = innerHeight;
}
function _fxLoop(){
  if(!_fxCtx) return;
  _fxCtx.clearRect(0, 0, _fxCanvas.width, _fxCanvas.height);
  for(let i = _confetti.length - 1; i >= 0; i--){
    const p = _confetti[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.28; p.vx *= 0.99;
    p.rot += p.vr; p.life -= 0.012;
    if(p.life <= 0){ _confetti.splice(i, 1); continue; }
    _fxCtx.save();
    _fxCtx.translate(p.x, p.y); _fxCtx.rotate(p.rot);
    _fxCtx.globalAlpha = Math.max(0, p.life);
    _fxCtx.fillStyle = p.color;
    _fxCtx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
    _fxCtx.restore();
  }
  requestAnimationFrame(_fxLoop);
}
function initFx(){
  _fxCanvas = $('fxCanvas');
  if(!_fxCanvas) return;
  _fxCtx = _fxCanvas.getContext('2d');
  _resizeFx();
  addEventListener('resize', _resizeFx);
  _fxLoop();
}
function burstConfetti(x, y, n = 40){
  for(let i = 0; i < n; i++){
    const a = Math.random()*Math.PI*2, s = Math.random()*8 + 4;
    _confetti.push({
      x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 3,
      size: Math.random()*7 + 4, color: pick(_CONF_COLORS),
      rot: Math.random()*Math.PI*2, vr: (Math.random()-0.5)*0.3, life: 1
    });
  }
}
function starBurst(x, y){
  const e = ['✨','⭐','💫','🌟','🎉'];
  for(let i = 0; i < 8; i++){
    const s = document.createElement('div');
    s.className = 'star-burst'; s.textContent = pick(e);
    s.style.left = x + 'px'; s.style.top = y + 'px';
    const a = (Math.PI*2*i)/8, d = 80 + Math.random()*40;
    s.style.setProperty('--dx', `calc(-50% + ${Math.cos(a)*d}px)`);
    s.style.setProperty('--dy', `calc(-50% + ${Math.sin(a)*d}px)`);
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 800);
  }
}

/* ═══ Progress (per-game completion in localStorage) ═══ */
(function(){
  function gameKey(){
    const p = location.pathname.split('/').filter(Boolean);
    const last = p[p.length-1] || 'index.html';
    return 'c2t/' + last.replace('.html','');
  }
  function load(){
    try { return JSON.parse(localStorage.getItem('c2t_progress') || '{}'); } catch(e){ return {}; }
  }
  function save(p){
    try { localStorage.setItem('c2t_progress', JSON.stringify(p)); } catch(e){}
  }
  window._c2tMarkComplete = function(){
    const p = load(), k = gameKey();
    if(!p[k]) p[k] = {};
    p[k].completed = true;
    p[k].completedAt = Date.now();
    p[k].plays = (p[k].plays || 0) + 1;
    save(p);
  };
  // Auto-mark when celebration screen activates
  document.addEventListener('DOMContentLoaded', () => {
    const c = document.getElementById('scrCeleb');
    if(c){
      const o = new MutationObserver(() => {
        if(c.classList.contains('active')) window._c2tMarkComplete();
      });
      o.observe(c, { attributes: true, attributeFilter: ['class'] });
    }
  });
})();
