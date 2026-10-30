const TREATS = ['🍬', '🍭', '🍫', '🍡', '🍬', '🍭', '🍪'];
const VEGGIES = ['🥦', '🥕', '🥬'];
const REQUIRED_CANDY = 8;
const TOTAL_FEEDS = 3;

export function initHalloweenGame(root) {
  root.innerHTML = `
    <div class="halloween-shell">
      <header class="halloween-header">
        <div class="title-lockup"><p class="eyebrow">A tiny Halloween adventure</p><h1>The Great <em>Candy</em> Catch</h1></div>
        <div class="header-actions">
          <button class="sound-toggle" type="button" aria-pressed="false" aria-label="Turn music on">♫ <span>Music off</span></button>
          <button class="game-reset" type="button" aria-label="Reset game">↻ <span>Start over</span></button>
        </div>
      </header>
      <main class="candy-game" aria-label="Halloween candy catching game">
        <div class="sky-decor" aria-hidden="true"><span class="moon">☾</span><i class="star star-a">✦</i><i class="star star-b">✧</i><i class="star star-c">✦</i><i class="star star-d">·</i><span class="cloud cloud-a"></span><span class="cloud cloud-b"></span></div>
        <div class="far-hills" aria-hidden="true"></div>
        <div class="game-copy"><p class="round-label">TRICK OR TREAT · <span class="round-number">ROUND 1 OF 3</span></p><h2 class="game-message" aria-live="polite">Catch the good stuff!</h2><p class="game-instruction">Move your mouse to steer the pumpkin. Watch out for veggies!</p></div>
        <div class="score-pill" aria-label="Candy in basket"><span class="score-candy">🍬</span><span class="basket-score">0</span><span class="score-divider">/</span><span>${REQUIRED_CANDY}</span></div>
        <div class="progress-dots" aria-label="Feeding rounds"><span class="progress-dot"></span><span class="progress-dot"></span><span class="progress-dot"></span></div>
        <div class="person-wrap" aria-label="A hungry Halloween friend">
          <div class="person-speech">Psst… I'm <b>starving!</b><span>✦</span></div>
          <div class="person-art-stage" role="img" aria-label="A friendly brunette witch whose tunic rounds as she eats candy">
            <img class="person-art pose-normal" src="assets/characters/witch-normal.png" alt="">
            <img class="person-art pose-belly-one" src="assets/characters/witch-belly-one.png" alt="">
            <img class="person-art pose-belly-two" src="assets/characters/witch-belly-two.png" alt="">
            <img class="person-art pose-rub" src="assets/characters/witch-rub.png" alt="">
            <img class="person-art pose-triumph" src="assets/characters/witch-triumph.png" alt="">
            <img class="person-art pose-surprise" src="assets/characters/witch-surprise.png" alt="">
          </div>
          <span class="belly-aura" aria-hidden="true"></span>
          <button class="belly-button" type="button" aria-label="Tap the glowing belly" title="Tap the glowing belly"></button>
        </div>
        <div class="candy-layer" aria-hidden="true"></div>
        <div class="veg-flash" aria-live="polite">Yikes! A veggie! Basket emptied!</div>
        <div class="feed-hint">Fill your basket to feed your friend!</div>
        <button class="feed-button" type="button" disabled>🍬 &nbsp; Feed your friend</button>
        <div class="basket-wrap" aria-label="Your pumpkin trick-or-treat basket">
          <div class="basket-candies"></div>
          <div class="pumpkin-basket"><span class="pumpkin-stem"></span><svg class="pumpkin-face" viewBox="0 0 100 65" aria-hidden="true"><path d="M8 7 29 12 17 31zM92 7 71 12 83 31zM44 27 56 27 50 39z" fill="#49242b"/><path d="M12 40 Q50 68 88 40 L82 54 Q50 65 18 54Z" fill="#49242b"/><path d="m28 49 8 3 4-5 7 6 7-6 7 6 6-6 8 2-2 7q-24 12-47 0z" fill="#ffb23e"/></svg></div>
          <div class="basket-meter" role="progressbar" aria-label="Candy in pumpkin basket" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0"><span class="basket-meter-fill"></span></div>
          <span class="basket-caption">BASKET FULLNESS</span>
        </div>
        <div class="ground-line" aria-hidden="true"></div>
        <div class="bush bush-left" aria-hidden="true">🎃</div><div class="bush bush-right" aria-hidden="true">🪦</div>
        <div class="victory-screen" hidden role="status" aria-live="assertive"><div class="victory-card"><span class="victory-sparkle">✦ &nbsp; ✧ &nbsp; ✦</span><p>TUMMY IS FULL</p><h2>YOU <em>WIN!</em></h2><span class="victory-subtitle">A Halloween surprise is brewing…</span></div></div>
      </main>
      <div class="surprise-modal" hidden role="dialog" aria-modal="true" aria-labelledby="surprise-title">
        <div class="modal-card"><button class="modal-close" type="button" aria-label="Close">×</button><p class="modal-kicker">WELL, WOULD YOU LOOK AT THAT…</p><h2 id="surprise-title">A little <em>pumpkin</em> is on the way!</h2><p class="modal-description">One very full tummy and one Halloween surprise. 🦇</p>
          <div class="ultrasound-placeholder"><img class="ultrasound-image" src="assets/ultrasound.jpg" alt="Ultrasound image"></div>
          <button class="modal-play-again" type="button">Play again <span>↻</span></button></div>
      </div>
      <div class="toast" role="status" aria-live="polite"></div>
    </div>`;

  const stage = root.querySelector('.candy-game');
  const candyLayer = root.querySelector('.candy-layer');
  const basket = root.querySelector('.basket-wrap');
  const candies = root.querySelector('.basket-candies');
  const feedButton = root.querySelector('.feed-button');
  const modal = root.querySelector('.surprise-modal');
  const person = root.querySelector('.person-wrap');
  const basketScore = root.querySelector('.basket-score');
  const message = root.querySelector('.game-message');
  const halloweenTrack = new Audio(new URL('../assets/music/halloween-ghost-party.mp3', import.meta.url));
  halloweenTrack.autoplay = true;
  halloweenTrack.loop = true;
  halloweenTrack.preload = 'auto';
  halloweenTrack.volume = 0.42;
  let state = freshState();
  let spawnTimer;
  let frame;
  let audioContext;
  let musicOn = false;
  let toastTimer;
  let finaleTimers = [];
  let lastSpawn = 0;
  let pointerX = stage.clientWidth / 2;

  function freshState() { return { count: 0, feeds: 0, busy: false, finished: false, surprise: false, items: new Set() }; }

  function updateHud() {
    basketScore.textContent = state.count;
    root.querySelector('.feed-button').disabled = state.count < REQUIRED_CANDY || state.busy || state.finished || state.surprise;
    root.querySelector('.feed-hint').textContent = state.count >= REQUIRED_CANDY ? 'Your friend is ready for a treat!' : `Fill your basket to ${REQUIRED_CANDY} candies to feed your friend!`;
    const round = Math.min(state.feeds + 1, TOTAL_FEEDS);
    root.querySelector('.round-number').textContent = state.feeds >= TOTAL_FEEDS ? 'SURPRISE TIME!' : `ROUND ${round} OF ${TOTAL_FEEDS}`;
    root.querySelectorAll('.progress-dot').forEach((dot, i) => dot.classList.toggle('done', i < state.feeds));
  }

  function updatePersonPose() {
    if (state.surprise) person.dataset.pose = 'surprise';
    else if (state.finished) person.dataset.pose = 'triumph';
    else if (state.feeds >= 2) person.dataset.pose = 'belly-two';
    else if (state.feeds === 1) person.dataset.pose = 'belly-one';
    else person.dataset.pose = 'normal';
  }

  function drawBasketCandy() {
    const meter = root.querySelector('.basket-meter');
    candies.innerHTML = '';
    for (let i = 0; i < Math.min(state.count, REQUIRED_CANDY); i++) {
      const piece = document.createElement('span');
      piece.className = 'basket-piece'; piece.textContent = TREATS[(i + state.feeds) % TREATS.length];
      piece.style.setProperty('--piece-x', `${15 + ((i * 37) % 72)}%`);
      piece.style.setProperty('--piece-y', `${18 + ((i * 23) % 43)}%`);
      piece.style.setProperty('--piece-tilt', `${(i * 31) % 55 - 28}deg`);
      candies.append(piece);
    }
    basket.classList.toggle('basket-full', state.count >= REQUIRED_CANDY);
    meter.setAttribute('aria-valuenow', String(state.count));
    meter.style.setProperty('--basket-fill', `${state.count / REQUIRED_CANDY * 100}%`);
  }

  function showToast(text) {
    const toast = root.querySelector('.toast'); toast.textContent = text; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 1500);
  }

  function addItem(type) {
    const item = document.createElement('span');
    item.className = `falling-item ${type === 'veggie' ? 'veggie' : 'treat'}`;
    item.textContent = type === 'veggie' ? VEGGIES[Math.floor(Math.random() * VEGGIES.length)] : TREATS[Math.floor(Math.random() * TREATS.length)];
    item.style.left = `${12 + Math.random() * 76}%`;
    item.style.top = '-54px';
    item.dataset.type = type;
    candyLayer.append(item); state.items.add(item);
  }

  function collect(item) {
    if (!state.items.has(item) || state.busy || state.finished || state.surprise) return;
    state.items.delete(item); item.remove();
    if (item.dataset.type === 'veggie') {
      state.count = 0; drawBasketCandy(); updateHud();
      feedButton.classList.remove('ready');
      basket.classList.remove('basket-hit'); void basket.offsetWidth; basket.classList.add('basket-hit');
      stage.classList.remove('veggie-hit'); void stage.offsetWidth; stage.classList.add('veggie-hit');
      message.textContent = 'Oh no, a sneaky veggie!'; showToast('Your candy tumbled away!');
      setTimeout(() => { if (!state.finished && !state.surprise) message.textContent = 'Catch the good stuff!'; }, 1650);
      return;
    }
    if (state.count < REQUIRED_CANDY) state.count++;
    drawBasketCandy(); updateHud(); basket.classList.remove('basket-bounce'); void basket.offsetWidth; basket.classList.add('basket-bounce');
    message.textContent = state.count >= REQUIRED_CANDY ? 'Candy delivery, coming up!' : 'Sweet catch! Keep going!';
    playNote([659, 784, 988][state.count % 3], .09);
    if (state.count >= REQUIRED_CANDY) feedButton.classList.add('ready');
  }

  function gameLoop(now) {
    const stageRect = stage.getBoundingClientRect();
    const basketRect = basket.getBoundingClientRect();
    const basketX = basketRect.left - stageRect.left;
    if (!state.busy && !state.finished && !state.surprise) {
      for (const item of [...state.items]) {
        const currentTop = Number.parseFloat(item.style.top) || 0;
        const speed = Number(item.dataset.speed) || 1.85;
        const nextTop = currentTop + speed;
        item.style.top = `${nextTop}px`;
        const ix = item.offsetLeft + item.offsetWidth / 2;
        if (nextTop + item.offsetHeight >= basket.offsetTop + 7 && nextTop < basket.offsetTop + basket.offsetHeight && ix >= basketX - 8 && ix <= basketX + basket.offsetWidth + 8) collect(item);
        else if (nextTop > stage.clientHeight + 70) { state.items.delete(item); item.remove(); }
      }
      if (now - lastSpawn > (state.count >= REQUIRED_CANDY ? 1100 : 560)) {
        lastSpawn = now;
        addItem(Math.random() < .18 ? 'veggie' : 'treat');
      }
    }
    frame = requestAnimationFrame(gameLoop);
  }

  function steer(event) {
    if (state.finished || state.surprise) return;
    const rect = stage.getBoundingClientRect();
    pointerX = Math.max(16, Math.min(stage.clientWidth - basket.offsetWidth - 16, event.clientX - rect.left - basket.offsetWidth / 2));
    basket.style.left = `${pointerX}px`;
  }

  function feedFriend() {
    if (state.count < REQUIRED_CANDY || state.busy || state.finished || state.surprise) return;
    state.busy = true; feedButton.classList.remove('ready'); feedButton.disabled = true; stage.classList.add('feeding');
    message.textContent = 'One spooky snack delivery!';
    for (let i = 0; i < 7; i++) {
      const bite = document.createElement('span'); bite.className = 'flying-treat'; bite.textContent = TREATS[i % TREATS.length];
      bite.style.setProperty('--flight-delay', `${i * 65}ms`); stage.append(bite);
      setTimeout(() => bite.remove(), 1100);
    }
    person.classList.add('nom-nom'); playTune([523, 659, 784, 1047]);
    setTimeout(() => {
      state.feeds++; state.count = 0; state.busy = false;
      person.classList.remove('nom-nom'); stage.classList.remove('feeding');
      updatePersonPose();
      person.classList.add('belly-grow'); setTimeout(() => person.classList.remove('belly-grow'), 600);
      drawBasketCandy(); updateHud();
      if (state.feeds < TOTAL_FEEDS) {
        message.textContent = ['That hit the spot! More, please!', 'Yum! My tummy is getting round!', ''][state.feeds - 1];
        showToast(['Tummy +1! Your friend is so happy!', 'Ooh, getting a little round!', ''][state.feeds - 1]);
        setTimeout(() => { if (!state.finished && !state.surprise) message.textContent = 'Catch the good stuff!'; }, 1900);
      } else beginSurprise();
    }, 1150);
  }

  function beginSurprise() {
    state.finished = true;
    state.items.forEach(item => item.remove()); state.items.clear();
    updatePersonPose();
    root.querySelector('.round-number').textContent = 'SURPRISE TIME!';
    root.querySelector('.feed-hint').textContent = 'Your friend has a little surprise…';
    message.textContent = 'A perfect Halloween!';
    person.classList.add('move-center', 'rub-belly');
    stage.classList.add('finale');
    const victory = root.querySelector('.victory-screen');
    victory.hidden = false;
    victory.classList.remove('fade-away');
    void victory.offsetWidth;
    victory.classList.add('celebrate');
    playTune([523, 659, 784, 1047]);
    finaleTimers.push(setTimeout(() => {
      victory.classList.add('fade-away');
      message.textContent = '';
      finaleTimers.push(setTimeout(() => {
        victory.hidden = true;
        person.classList.remove('rub-belly'); person.dataset.pose = 'triumph';
        message.textContent = 'We did it!';
        finaleTimers.push(setTimeout(() => {
          person.classList.add('rub-belly'); person.dataset.pose = 'rub';
          message.textContent = '';
          finaleTimers.push(setTimeout(() => {
            person.classList.remove('rub-belly'); person.classList.add('surprised');
            state.surprise = true; updatePersonPose();
            message.textContent = 'Wait… what is that glow?';
            finaleTimers.push(setTimeout(() => {
              person.classList.add('belly-glow'); root.querySelector('.belly-button').classList.add('show');
              message.textContent = 'Tap the glowing belly!';
              showToast('Psst… tap the glowing belly! ✨');
            }, 1100));
          }, 1000));
        }, 1000));
      }, 850));
    }, 2400));
  }

  function openSurprise() {
    if (!state.finished || !state.surprise || !modal.hidden) return;
    modal.hidden = false; document.body.classList.add('modal-open');
    modal.querySelector('.modal-card').classList.add('pop-in'); playTune([659, 784, 988, 1318]);
  }

  function resetGame() {
    finaleTimers.forEach(clearTimeout); finaleTimers = [];
    state.items.forEach(item => item.remove()); state = freshState();
    candyLayer.innerHTML = ''; root.querySelectorAll('.flying-treat').forEach(el => el.remove());
    basket.style.left = `${(stage.clientWidth - basket.offsetWidth) / 2}px`;
    person.className = 'person-wrap'; delete person.dataset.pose; updatePersonPose();
    feedButton.classList.remove('ready');
    stage.className = 'candy-game'; modal.hidden = true; modal.querySelector('.modal-card').classList.remove('pop-in');
    root.querySelector('.victory-screen').hidden = true;
    root.querySelector('.victory-screen').className = 'victory-screen';
    document.body.classList.remove('modal-open');
    root.querySelector('.belly-button').classList.remove('show');
    root.querySelector('.feed-hint').textContent = `Fill your basket to ${REQUIRED_CANDY} candies to feed your friend!`;
    message.textContent = 'Catch the good stuff!';
    root.querySelector('.round-number').textContent = 'ROUND 1 OF 3';
    root.querySelectorAll('.progress-dot').forEach(dot => dot.classList.remove('done'));
    drawBasketCandy(); updateHud(); lastSpawn = 0;
    root.querySelector('.game-reset').animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-360deg)' }], { duration: 450 });
  }

  // Short synthesized notes remain as candy and feeding sound effects.
  function playNote(frequency, duration = .22, volume = .035) {
    if (!audioContext || audioContext.state === 'closed') return;
    const start = audioContext.currentTime;
    const osc = audioContext.createOscillator(); const gain = audioContext.createGain();
    osc.type = 'triangle'; osc.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .025); gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    osc.connect(gain).connect(audioContext.destination); osc.start(start); osc.stop(start + duration + .02);
  }
  function startMusic() {
    if (!audioContext) { const AudioContext = window.AudioContext || window.webkitAudioContext; if (AudioContext) audioContext = new AudioContext(); }
    if (audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
    musicOn = true;
    const playback = halloweenTrack.play();
    playback?.catch(() => {
      if (!musicOn) return;
      musicOn = false;
      updateMusicButton();
    });
    updateMusicButton();
  }
  function stopMusic() {
    musicOn = false; halloweenTrack.pause(); updateMusicButton();
  }
  function updateMusicButton() {
    const button = root.querySelector('.sound-toggle');
    button.innerHTML = musicOn ? '♫ <span>Music on</span>' : '♫ <span>Music off</span>';
    button.setAttribute('aria-pressed', String(musicOn));
    button.setAttribute('aria-label', musicOn ? 'Turn music off' : 'Turn music on');
    button.classList.toggle('on', musicOn);
  }
  function playTune(notes) { if (!musicOn) return; notes.forEach((note, i) => setTimeout(() => playNote(note, .18, .035), i * 110)); }

  stage.addEventListener('pointermove', steer);
  stage.addEventListener('pointerdown', steer);
  feedButton.addEventListener('click', feedFriend);
  root.querySelector('.game-reset').addEventListener('click', resetGame);
  const soundToggle = root.querySelector('.sound-toggle');
  soundToggle.addEventListener('click', () => {
    window.removeEventListener('pointerdown', tryAutoplay);
    window.removeEventListener('keydown', tryAutoplay);
    musicOn ? stopMusic() : startMusic();
  });
  root.querySelector('.belly-button').addEventListener('click', openSurprise);
  root.querySelector('.modal-close').addEventListener('click', () => { modal.hidden = true; document.body.classList.remove('modal-open'); });
  root.querySelector('.modal-play-again').addEventListener('click', resetGame);
  modal.addEventListener('click', event => { if (event.target === modal) { modal.hidden = true; document.body.classList.remove('modal-open'); } });
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) { modal.hidden = true; document.body.classList.remove('modal-open'); } });
  window.addEventListener('resize', () => { if (!state.finished) basket.style.left = `${(stage.clientWidth - basket.offsetWidth) / 2}px`; });

  // Start on load where allowed, then retry on the first gesture if the browser blocks autoplay.
  const tryAutoplay = (event) => {
    if (event.target?.closest?.('.sound-toggle')) return;
    window.removeEventListener('pointerdown', tryAutoplay);
    window.removeEventListener('keydown', tryAutoplay);
    if (!musicOn) startMusic();
  };
  window.addEventListener('pointerdown', tryAutoplay);
  window.addEventListener('keydown', tryAutoplay);
  startMusic();
  updatePersonPose(); updateHud(); drawBasketCandy(); requestAnimationFrame(() => { basket.style.left = `${(stage.clientWidth - basket.offsetWidth) / 2}px`; frame = requestAnimationFrame(gameLoop); });
  return () => { cancelAnimationFrame(frame); clearTimeout(toastTimer); halloweenTrack.pause(); window.removeEventListener('pointerdown', tryAutoplay); window.removeEventListener('keydown', tryAutoplay); if (audioContext) audioContext.close(); };
}
