import { photos } from './photos.js';
import { calls } from './audio.js';

const el = id => document.getElementById(id);
const panel = el('challenge');
const grid = el('grid');
const anchor = el('anchor');
const names = [...new Set(photos.map(photo => photo.species))];
const headphones = el('mode').innerHTML;
const imageIcon = '<svg viewBox="0 0 24 24"><path d="M12 5c-5 0-9.27 3.1-11 7 1.73 3.9 6 7 11 7s9.27-3.1 11-7c-1.73-3.9-6-7-11-7zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>';
let audioMode = false;
let target;
let tiles = [];
let recording;
let player;
let firstRound = true;
let loadingTimer;

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function feedback(message = '') {
  el('feedback').textContent = message;
  el('feedback').hidden = !message;
}
function position() {
  if (!panel.open) return;
  const square = anchor.querySelector('.box').getBoundingClientRect();
  const centerY = square.top + square.height / 2;
  const gap = 10;
  const margin = 6;
  const available = innerWidth - square.right - gap - margin;
  panel.style.maxWidth = available >= 240 ? available + 'px' : 'none';
  const rightEdge = innerWidth - panel.offsetWidth - margin;
  const beside = available >= 240;
  const left = beside ? square.right + gap : Math.max(margin, rightEdge);
  const top = Math.max(margin, Math.min(centerY - panel.offsetHeight / 2, innerHeight - panel.offsetHeight - margin));
  panel.style.left = left + 'px';
  panel.style.top = top + 'px';
  panel.classList.toggle('beside', beside);
  panel.style.setProperty('--pointer-y', (centerY - top) + 'px');
}
function stopCall() {
  if (player) {
    player.onerror = null;
    player.pause();
    player.removeAttribute('src');
    player.load();
    player = null;
  }
}
function playCall() {
  const current = player;
  current.currentTime = 0;
  current.play().then(() => {
    if (player === current) {
      feedback();
    }
  }).catch(() => {
    if (player === current) feedback('Press Play to hear the recording, or reload for another bird.');
  });
}
function photoRound() {
  target = shuffled(names.filter(name => name !== target))[0];
  const count = firstRound ? 2 : (Math.random() < .2 ? 0 : 1 + Math.floor(Math.random() * 3));
  firstRound = false;
  const matches = shuffled(photos.filter(photo => photo.species === target)).slice(0, count);
  const distractors = shuffled(photos.filter(photo => photo.species !== target)).slice(0, 9 - matches.length);
  tiles = shuffled([...matches, ...distractors]);
  const article = /^[aeiou]/i.test(target) ? 'an' : 'a';
  el('prompt').textContent = 'Select all squares containing';
  el('target').textContent = article + ' ' + target.toLowerCase();
  el('hint').textContent = 'If there are none, click skip.';
  el('submit').textContent = 'Skip';
  grid.replaceChildren(...tiles.map((photo, index) => {
    const btn = document.createElement('button');
    btn.className = 'tile';
    btn.setAttribute('aria-label', 'Square ' + (index + 1));
    btn.setAttribute('aria-pressed', 'false');
    const img = new Image();
    img.alt = '';
    img.onload = () => btn.removeAttribute('aria-busy');
    img.onerror = () => {
      btn.removeAttribute('aria-busy');
      btn.disabled = true;
      img.alt = 'Photo unavailable';
      if (grid.contains(btn) && !audioMode) feedback('A photo could not load. Reload the challenge or try audio.');
    };
    btn.setAttribute('aria-busy', 'true');
    img.src = photo.src;
    btn.append(img);
    btn.onclick = () => {
      btn.setAttribute('aria-pressed', btn.getAttribute('aria-pressed') !== 'true');
      el('submit').textContent = grid.querySelector('[aria-pressed=true]') ? 'Verify' : 'Skip';
      feedback();
    };
    return btn;
  }));
}
function round(message = '') {
  stopCall();
  el('help').hidden = true;
  el('info').setAttribute('aria-expanded', 'false');
  feedback(message);
  grid.hidden = audioMode;
  el('sound').hidden = !audioMode;
  el('photo-prompt').hidden = audioMode;
  panel.classList.toggle('audio', audioMode);
  panel.setAttribute('aria-labelledby', audioMode ? 'audio-prompt' : 'target');
  el('mode').innerHTML = audioMode ? imageIcon : headphones;
  el('mode').title = audioMode ? 'Get an image challenge' : 'Get an audio challenge';
  el('mode').setAttribute('aria-label', el('mode').title);
  if (audioMode) {
    recording = shuffled(calls.filter(call => call !== recording))[0];
    player = new Audio(recording.src);
    player.onerror = () => feedback('This recording could not load. Use reload to try another bird.');
    el('answer').value = '';
    el('submit').textContent = 'Verify';
  } else {
    photoRound();
  }
  position();
  el(audioMode ? 'play' : 'target').focus({preventScroll:true});
}
anchor.onclick = () => {
  if (loadingTimer) return;
  anchor.setAttribute('aria-checked', 'false');
  anchor.setAttribute('aria-busy', 'true');
  anchor.classList.add('loading');
  el('status').textContent = 'Loading bird challenge.';
  audioMode = false;
  loadingTimer = setTimeout(() => {
    loadingTimer = undefined;
    anchor.classList.remove('loading');
    anchor.removeAttribute('aria-busy');
    el('status').textContent = '';
    panel.showModal();
    round();
  }, 500);
};
el('reload').onclick = () => round();
el('mode').onclick = () => {
  audioMode = !audioMode;
  round();
};
el('play').onclick = playCall;
const normalize = value => value.normalize('NFD').toLowerCase().replace(/[^a-z]/g, '');
function verify() {
  if (!audioMode && grid.querySelector(':disabled, [aria-busy=true]')) {
    feedback(grid.querySelector(':disabled') ? 'A photo could not load. Reload the challenge or try audio.' : 'Please wait for the photos to load.');
    return;
  }
  if (audioMode && !el('answer').value.trim()) {
    feedback('Enter a bird name first.');
    el('answer').focus();
    return;
  }
  const correct = audioMode
    ? [recording.species, ...recording.aliases].some(name => normalize(name) === normalize(el('answer').value))
    : tiles.every((photo, i) => (photo.species === target) === (grid.children[i].getAttribute('aria-pressed') === 'true'));
  if (!correct) {
    round('Please try again.');
    return;
  }
  anchor.setAttribute('aria-checked', 'true');
  el('status').textContent = 'Bird identified. Click the checkbox to play again.';
  panel.close();
}
el('submit').onclick = verify;
el('answer').onkeydown = event => { if (event.key === 'Enter') verify(); };
el('info').onclick = () => {
  const help = el('help');
  help.textContent = audioMode ? 'Listen again with Play, type the bird’s name, then click Verify.' : 'Select each matching bird, then click Verify. Click Skip only when there are no matches.';
  help.hidden = !help.hidden;
  el('info').setAttribute('aria-expanded', !help.hidden);
};
panel.addEventListener('close', stopCall);
el('reset').onclick = () => {
  clearTimeout(loadingTimer);
  loadingTimer = undefined;
  anchor.classList.remove('loading');
  anchor.removeAttribute('aria-busy');
  if (panel.open) panel.close();
  stopCall();
  firstRound = true;
  audioMode = false;
  target = undefined;
  recording = null;
  tiles = [];
  grid.replaceChildren();
  el('answer').value = '';
  feedback();
  anchor.setAttribute('aria-checked', 'false');
  el('status').textContent = 'BIRDCHA reset.';
  anchor.focus();
};
el('credits').onclick = () => el('about').showModal();
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
}
new ResizeObserver(position).observe(panel);
window.addEventListener('resize', position);
