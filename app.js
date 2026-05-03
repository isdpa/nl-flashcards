let manifest = [];
let allCards = [];   // cards matching current selection (deck + type)
let queue = [];      // shuffled remaining cards
let correctCount = 0;
let totalCount = 0;
let isFlipped = false;
let showContext = false;

const TYPE_COLORS = {
  verbe:    '#3b82f6',
  adjectif: '#10b981',
  adverbe:  '#f59e0b',
  mot:      '#8b5cf6'
};

async function init() {
  try {
    const res = await fetch('data/manifest.json');
    manifest = await res.json();
    buildDeckSelect();
    await loadAndStart();
  } catch (e) {
    setError('Impossible de charger les données. Servez le site via HTTP.');
  }
}

function buildDeckSelect() {
  const sel = document.getElementById('deck-select');
  sel.innerHTML = '<option value="all">Tous les domaines</option>';
  manifest.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.file;
    opt.textContent = item.label;
    sel.appendChild(opt);
  });
}

async function loadAndStart() {
  const deckVal = document.getElementById('deck-select').value;
  const typeVal = document.getElementById('type-select').value;

  let cards = [];
  try {
    if (deckVal === 'all') {
      const results = await Promise.all(
        manifest.map(item => fetch(item.file).then(r => r.json()))
      );
      results.forEach(data => cards.push(...(data.cards || [])));
    } else {
      const data = await fetch(deckVal).then(r => r.json());
      cards = data.cards || [];
    }
  } catch (e) {
    setError('Impossible de charger ce jeu de cartes.');
    return;
  }

  if (typeVal !== 'all') {
    cards = cards.filter(c => c.type === typeVal);
  }

  allCards = cards;
  startSession(cards);
}

function startSession(cards) {
  if (cards.length === 0) {
    setError('Aucune carte pour cette sélection.');
    updateScoreDisplay(0, 0, 0);
    return;
  }

  queue = shuffle([...cards]);
  correctCount = 0;
  totalCount = cards.length;
  isFlipped = false;

  document.getElementById('completion').classList.add('hidden');
  document.getElementById('card').classList.remove('hidden');
  document.getElementById('answer-btns').classList.add('hidden');

  updateScoreDisplay(0, cards.length, cards.length);
  showCard(queue[0]);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showCard(card) {
  const cardEl = document.getElementById('card');

  // Snap back to front instantly (no animation) to avoid showing the next
  // card's translation during the flip-back animation
  cardEl.style.transition = 'none';
  cardEl.classList.remove('flipped');
  void cardEl.offsetHeight; // flush style so the snap is applied immediately
  cardEl.style.transition = '';

  isFlipped = false;
  document.getElementById('answer-btns').classList.add('hidden');

  document.getElementById('word-nl').textContent = card.nl;
  document.getElementById('word-nl-back').textContent = card.nl;
  document.getElementById('word-fr').textContent = card.fr;

  const color = TYPE_COLORS[card.type] || '#6b7280';
  ['badge-front', 'badge-back'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = card.type || '';
    el.style.background = color;
  });

  const ctxEl = document.getElementById('context-box');
  if (card.context_nl) {
    document.getElementById('context-nl').textContent = card.context_nl;
    document.getElementById('context-fr').textContent = card.context_fr || '';
    ctxEl.classList.toggle('hidden', !showContext);
  } else {
    ctxEl.classList.add('hidden');
  }
}

function flip() {
  if (queue.length === 0 || isFlipped) return;
  isFlipped = true;
  document.getElementById('card').classList.add('flipped');
  setTimeout(() => {
    document.getElementById('answer-btns').classList.remove('hidden');
  }, 280);
}

function markCorrect() {
  if (!isFlipped || queue.length === 0) return;
  queue.shift();
  correctCount++;
  updateScoreDisplay(correctCount, queue.length, totalCount);
  if (queue.length === 0) {
    showCompletion();
  } else {
    showCard(queue[0]);
  }
}

function markIncorrect() {
  if (!isFlipped || queue.length === 0) return;
  const card = queue.shift();
  if (queue.length > 0) {
    const pos = Math.floor(Math.random() * queue.length) + 1;
    queue.splice(pos, 0, card);
  } else {
    queue.push(card);
  }
  showCard(queue[0]);
}

function updateScoreDisplay(correct, remaining, total) {
  document.getElementById('score-correct').textContent = correct;
  document.getElementById('score-remaining').textContent = remaining;
  const pct = total > 0 ? (correct / total) * 100 : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
}

function showCompletion() {
  document.getElementById('card').classList.add('hidden');
  document.getElementById('answer-btns').classList.add('hidden');
  document.getElementById('completion').classList.remove('hidden');
}

function toggleContext() {
  showContext = document.getElementById('show-context').checked;
  if (queue.length === 0) return;
  const card = queue[0];
  if (card.context_nl) {
    document.getElementById('context-box').classList.toggle('hidden', !showContext);
  }
}

function setError(msg) {
  document.getElementById('word-nl').textContent = msg;
  document.getElementById('word-fr').textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('card').addEventListener('click', flip);
  document.getElementById('correct-btn').addEventListener('click', markCorrect);
  document.getElementById('incorrect-btn').addEventListener('click', markIncorrect);
  document.getElementById('show-context').addEventListener('change', toggleContext);
  document.getElementById('deck-select').addEventListener('change', loadAndStart);
  document.getElementById('type-select').addEventListener('change', loadAndStart);
  document.getElementById('restart-btn').addEventListener('click', () => startSession(allCards));

  document.addEventListener('keydown', e => {
    if (e.key === ' ')                         { e.preventDefault(); flip(); }
    else if (e.key === 'ArrowRight' && isFlipped) markCorrect();
    else if (e.key === 'ArrowLeft'  && isFlipped) markIncorrect();
  });

  init();
});