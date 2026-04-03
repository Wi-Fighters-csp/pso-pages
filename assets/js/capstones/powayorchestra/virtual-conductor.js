(function () {
  const root = document.querySelector('[data-virtual-conductor-root]');
  if (!root) return;

  const playerHost = document.getElementById('vc-youtube-player');
  const trackSelect = document.getElementById('vc-track-select');
  const startButton = document.getElementById('vc-start');
  const stopButton = document.getElementById('vc-stop');
  const tapButton = document.getElementById('vc-tap');
  const pulse = document.getElementById('vc-pulse');
  const targetRing = document.getElementById('vc-target-ring');
  const rimHoldRing = document.getElementById('vc-rim-hold');
  const countdown = document.getElementById('vc-countdown');
  const feedback = document.getElementById('vc-feedback');
  const trackName = document.getElementById('vc-track-name');
  const tempo = document.getElementById('vc-tempo');
  const rate = document.getElementById('vc-rate');
  const accuracy = document.getElementById('vc-accuracy');
  const streak = document.getElementById('vc-streak');
  const stability = document.getElementById('vc-stability');
  const stabilityBar = document.getElementById('vc-stability-bar');
  const score = document.getElementById('vc-score');
  const special = document.getElementById('vc-special');
  const specialBar = document.getElementById('vc-special-bar');
  const judgement = document.getElementById('vc-judgement');
  const gestureLabel = document.getElementById('vc-gesture-label');
  const gestureCopy = document.getElementById('vc-gesture-copy');
  const gestureReadout = document.getElementById('vc-gesture-readout');
  const levelTitle = document.getElementById('vc-level-title');
  const levelCopy = document.getElementById('vc-level-copy');
  const levelTags = document.getElementById('vc-level-tags');

  if (!playerHost || !trackSelect || !startButton || !stopButton || !tapButton || !pulse || !targetRing || !rimHoldRing || !countdown || !feedback) return;

  const LEVELS = {
    '0oaazxCPNwU': {
      title: 'Egmont Overture, Op. 84',
      bpm: 76,
      tags: ['Dynamic control', 'Tempo transition', 'Steady pulse'],
      description: 'Control the opening pulse, then manage a gradual acceleration without letting the orchestra rush.',
      perfectWindow: 90,
      goodWindow: 320,
      specialLabel: 'Build intensity',
      specialMode: 'egmont'
    },
    '2c0zH9u9X8M': {
      title: 'Polonaise from Eugene Onegin',
      bpm: 84,
      tags: ['3/4 feel', 'Accent bonus', 'Elegant timing'],
      description: 'Hold the dance pulse steady and make beat one feel weighty and ceremonial.',
      perfectWindow: 96,
      goodWindow: 340,
      specialLabel: 'Accent bonus',
      specialMode: 'polonaise'
    },
    ikQNFqVkNNc: {
      title: 'Overture to the Marriage of Figaro, K. 492',
      bpm: 132,
      tags: ['Speed and clarity', 'Fast tempo', 'Tight windows'],
      description: 'Keep every gesture clean at speed while managing quick entrances between sections.',
      perfectWindow: 72,
      goodWindow: 260,
      specialLabel: 'Clarity chain',
      specialMode: 'figaro'
    },
    '3h9P3yZ9Q8o': {
      title: 'Slavonic Dance No. 8',
      bpm: 92,
      tags: ['Rhythm complexity', 'Bounce control', 'Accent timing'],
      description: 'Stay grounded in the pulse, then catch the off-beat prompts without losing the main beat.',
      perfectWindow: 104,
      goodWindow: 360,
      specialLabel: 'Off-beat control',
      specialMode: 'slavonic'
    },
    U9C0qK0sG9E: {
      title: 'Le Corsaire Overture',
      bpm: 148,
      tags: ['Fast consistency', 'High energy', 'Hard mode'],
      description: 'Keep the beat clear at a fast tempo and hold steady control through a bright, energetic overture.',
      perfectWindow: 64,
      goodWindow: 240,
      specialLabel: 'Fast control',
      specialMode: 'figaro'
    }
  };

  const state = {
    sessionActive: false,
    countdownActive: false,
    level: null,
    player: null,
    playerReadyPromise: null,
    isPlayerPlaying: false,
    currentVideoId: '',
    baseBpm: 76,
    playbackRate: 1,
    startTime: 0,
    startPerfTime: 0,
    offsetMs: 120,
    resolvedBeatIndices: new Set(),
    lastPulseBeatIndex: 0,
    lastMissedBeatIndex: 0,
    countdownTimer: null,
    animationFrame: null,
    countdownRemainingMs: 5000,
    totalBeats: 0,
    streak: 0,
    score: 0,
    accuracyAverage: 0,
    accuracyCount: 0,
    stability: 100,
    specialMeter: 0,
    lastJudgement: 'Ready',
    tapFeedbackTimer: null,
    rimHoldTimer: null,
    waitForPlayFrame: null,
    playStartFallbackTimer: null
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clearTimer(name) {
    if (state[name]) {
      window.clearInterval(state[name]);
      window.clearTimeout(state[name]);
      state[name] = null;
    }
  }

  function stopSyncLoop() {
    if (state.animationFrame) {
      window.cancelAnimationFrame(state.animationFrame);
      state.animationFrame = null;
    }
  }

  function stopWaitForPlayLoop() {
    if (state.waitForPlayFrame) {
      window.cancelAnimationFrame(state.waitForPlayFrame);
      state.waitForPlayFrame = null;
    }
  }

  function startAudioSyncAnchor(track) {
    state.startTime = track.startSeconds > 0 ? track.startSeconds : 0;
    if (state.player && typeof state.player.getCurrentTime === 'function') {
      const playerTime = Number(state.player.getCurrentTime());
      if (Number.isFinite(playerTime) && playerTime >= 0) state.startTime = playerTime;
    }
    state.startPerfTime = performance.now();
  }

  function resetBeatTracking() {
    state.resolvedBeatIndices.clear();
    state.lastPulseBeatIndex = 0;
    state.lastMissedBeatIndex = 0;
  }

  function formatCountdown(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function updateCountdownLabel(prefix) {
    countdown.textContent = `${prefix}: ${formatCountdown(state.countdownRemainingMs)}`;
  }

  function formatShortTime(seconds) {
    const totalSeconds = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(totalSeconds / 60);
    const remainder = totalSeconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  }

  function getSelectedTrack() {
    const option = trackSelect.options[trackSelect.selectedIndex];
    const videoId = option ? option.dataset.videoId : '0oaazxCPNwU';
    const level = LEVELS[videoId] || LEVELS['0oaazxCPNwU'];
    return {
      name: option ? option.textContent.trim() : level.title,
      videoId,
      url: option ? option.dataset.videoUrl : '',
      bpm: Number(option ? option.dataset.bpm : level.bpm) || level.bpm,
      startSeconds: Number(option ? option.dataset.startSeconds : 0) || 0,
      level
    };
  }

  function loadYouTubeIframeApi() {
    if (window.YT && typeof window.YT.Player === 'function') return Promise.resolve(window.YT);
    if (window.__psoYouTubeIframeApiPromise) return window.__psoYouTubeIframeApiPromise;
    window.__psoYouTubeIframeApiPromise = new Promise((resolve) => {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof previousReady === 'function') previousReady();
        resolve(window.YT);
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
      }
    });
    return window.__psoYouTubeIframeApiPromise;
  }

  function getActualPlaybackRate() {
    if (!state.player || typeof state.player.getPlaybackRate !== 'function') return state.playbackRate;
    const playerRate = Number(state.player.getPlaybackRate());
    return Number.isFinite(playerRate) && playerRate > 0 ? playerRate : state.playbackRate;
  }

  function applyPlaybackRate(nextRate) {
    state.playbackRate = clamp(nextRate, 0.25, 2);
    if (!state.player || typeof state.player.setPlaybackRate !== 'function') return state.playbackRate;
    let targetRate = state.playbackRate;
    const supportedRates = typeof state.player.getAvailablePlaybackRates === 'function'
      ? state.player.getAvailablePlaybackRates()
      : [];
    if (Array.isArray(supportedRates) && supportedRates.length) {
      targetRate = supportedRates.reduce((closest, candidate) => {
        return Math.abs(candidate - state.playbackRate) < Math.abs(closest - state.playbackRate) ? candidate : closest;
      }, supportedRates[0]);
    }
    state.player.setPlaybackRate(targetRate);
    state.playbackRate = getActualPlaybackRate();
    return state.playbackRate;
  }

  async function ensurePlayer(videoId) {
    const YT = await loadYouTubeIframeApi();
    if (state.player) {
      if (videoId && state.currentVideoId !== videoId) {
        state.currentVideoId = videoId;
        state.player.loadVideoById(videoId);
      }
      return state.player;
    }
    if (!state.playerReadyPromise) {
      state.playerReadyPromise = new Promise((resolve, reject) => {
        state.currentVideoId = videoId;
        state.player = new YT.Player(playerHost, {
          height: '1',
          width: '1',
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0
          },
          events: {
            onReady: () => resolve(state.player),
            onStateChange: (event) => {
              state.isPlayerPlaying = event.data === YT.PlayerState.PLAYING;
            },
            onError: () => reject(new Error('Unable to load the selected YouTube performance.'))
          }
        });
      });
    }
    return state.playerReadyPromise;
  }

  function setFeedback(message) {
    feedback.textContent = message;
  }

  function setJudgement(text) {
    state.lastJudgement = text;
    judgement.textContent = text;
  }

  function updateMeters() {
    stability.textContent = `${Math.round(state.stability)}%`;
    stabilityBar.style.transform = `scaleX(${clamp(state.stability / 100, 0, 1)})`;
    score.textContent = String(Math.max(0, Math.round(state.score)));
    specialBar.style.transform = `scaleX(${clamp(state.specialMeter / 100, 0, 1)})`;
  }

  function updateReadout() {
    const track = getSelectedTrack();
    trackName.textContent = track.name;
    tempo.textContent = `${Math.round(state.baseBpm * getActualPlaybackRate())} BPM`;
    rate.textContent = `${getActualPlaybackRate().toFixed(2)}x`;
    accuracy.textContent = state.accuracyCount > 0 ? `${Math.round(state.accuracyAverage)}%` : '--';
    streak.textContent = String(state.streak);
    updateMeters();
  }

  function renderLevelDetails() {
    const track = getSelectedTrack();
    state.level = track.level;
    state.baseBpm = track.bpm;
    levelTitle.textContent = track.level.title;
    levelCopy.textContent = track.startSeconds > 0
      ? `${track.level.description} The game skips to the orchestra entrance at ${formatShortTime(track.startSeconds)}.`
      : track.level.description;
    special.textContent = track.level.specialLabel;
    levelTags.innerHTML = track.level.tags.map((tag) => `<span>${tag}</span>`).join('');
    gestureLabel.textContent = 'Click On Beat';
    updateCountdownLabel('Ready window');
  }

  function pulseBeat() {
    pulse.classList.remove('is-beating');
    void pulse.offsetWidth;
    pulse.classList.add('is-beating');
  }

  function flashTapButton(result) {
    clearTimer('tapFeedbackTimer');
    tapButton.classList.remove('is-hit-perfect', 'is-hit-good', 'is-hit-miss');
    void tapButton.offsetWidth;
    if (result === 'perfect') {
      tapButton.classList.add('is-hit-perfect');
    } else if (result === 'early' || result === 'late' || result === 'good') {
      tapButton.classList.add('is-hit-good');
    } else {
      tapButton.classList.add('is-hit-miss');
    }
    state.tapFeedbackTimer = window.setTimeout(() => {
      tapButton.classList.remove('is-hit-perfect', 'is-hit-good', 'is-hit-miss');
      state.tapFeedbackTimer = null;
    }, 220);
  }

  function showRimHoldWindow() {
    clearTimer('rimHoldTimer');
    rimHoldRing.classList.add('is-visible');
    state.rimHoldTimer = window.setTimeout(() => {
      rimHoldRing.classList.remove('is-visible');
      state.rimHoldTimer = null;
    }, 1000);
  }

  function intervalMs() {
    return 60000 / (state.baseBpm * getActualPlaybackRate());
  }

  function secondsPerBeat() {
    return 60 / (state.baseBpm * getActualPlaybackRate());
  }

  function hitWindowMs() {
    return 1800;
  }

  function getCurrentAudioTime() {
    const fallbackSeconds = Math.max(0, ((performance.now() - state.startPerfTime) / 1000) * getActualPlaybackRate());
    if (!state.player || typeof state.player.getCurrentTime !== 'function') {
      return fallbackSeconds + (state.offsetMs / 1000);
    }
    const currentTime = Number(state.player.getCurrentTime());
    if (!Number.isFinite(currentTime)) {
      return fallbackSeconds + (state.offsetMs / 1000);
    }
    return Math.max(0, (currentTime - state.startTime) + (state.offsetMs / 1000));
  }

  function getBeatMetrics(audioTime = getCurrentAudioTime()) {
    const beatLength = secondsPerBeat();
    const rawBeat = audioTime / beatLength;
    const phase = ((rawBeat % 1) + 1) % 1;
    const pulseBeatIndex = Math.max(0, Math.floor(rawBeat));
    return {
      audioTime,
      beatLength,
      rawBeat,
      phase,
      pulseBeatIndex
    };
  }

  function updateRingVisual(phase) {
    const rimScale = 10.5 / 18;
    const scale = 1 - (phase * (1 - rimScale));
    targetRing.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function syncPulse(metrics) {
    if (metrics.pulseBeatIndex <= state.lastPulseBeatIndex) return;
    state.totalBeats += metrics.pulseBeatIndex - state.lastPulseBeatIndex;
    state.lastPulseBeatIndex = metrics.pulseBeatIndex;
    pulseBeat();
  }

  function syncRimHold(metrics) {
    const lastBeatTime = metrics.pulseBeatIndex * metrics.beatLength;
    const holdAge = metrics.audioTime - lastBeatTime;
    const shouldShow = metrics.pulseBeatIndex >= 1 && holdAge >= 0 && holdAge <= (hitWindowMs() / 1000);
    rimHoldRing.classList.toggle('is-visible', shouldShow);
  }

  function markBeatMissByIndex(beatIndex) {
    if (!state.sessionActive || beatIndex < 1 || state.resolvedBeatIndices.has(beatIndex)) return;
    state.resolvedBeatIndices.add(beatIndex);
    state.streak = 0;
    state.stability = clamp(state.stability - 3, 0, 100);
    state.specialMeter = clamp(state.specialMeter - 8, 0, 100);
    state.score = Math.max(0, state.score - 30);
    setJudgement('Miss');
    setFeedback('The beat slipped by. Reconnect with the pattern and recover the ensemble.');
    gestureReadout.textContent = 'Missed the rim hit window';
    flashTapButton('miss');
    updateReadout();
    degradeForInstability();
  }

  function syncMisses(metrics) {
    const latestMissableBeatIndex = Math.floor((metrics.audioTime - (hitWindowMs() / 1000)) / metrics.beatLength);
    if (latestMissableBeatIndex <= state.lastMissedBeatIndex) return;
    for (let beatIndex = state.lastMissedBeatIndex + 1; beatIndex <= latestMissableBeatIndex; beatIndex += 1) {
      markBeatMissByIndex(beatIndex);
    }
    state.lastMissedBeatIndex = latestMissableBeatIndex;
  }

  function getNearestJudgeBeat(audioTime) {
    const beatLength = secondsPerBeat();
    const roughIndex = Math.max(1, Math.round(audioTime / beatLength));
    let nearestBeat = null;
    let nearestDelta = Number.POSITIVE_INFINITY;

    [roughIndex - 1, roughIndex, roughIndex + 1].forEach((beatIndex) => {
      if (beatIndex < 1 || state.resolvedBeatIndices.has(beatIndex)) return;
      const beatTime = beatIndex * beatLength;
      const signedDeltaSeconds = audioTime - beatTime;
      const timingDeltaMs = Math.abs(signedDeltaSeconds * 1000);
      if (timingDeltaMs > hitWindowMs() || timingDeltaMs >= nearestDelta) return;
      nearestDelta = timingDeltaMs;
      nearestBeat = {
        index: beatIndex,
        time: beatTime,
        signedDeltaSeconds,
        timingDeltaMs
      };
    });

    return nearestBeat;
  }

  function startSyncLoop() {
    stopSyncLoop();

    const tick = () => {
      if (!state.sessionActive) {
        state.animationFrame = null;
        return;
      }

      const metrics = getBeatMetrics();
      updateRingVisual(metrics.phase);
      syncPulse(metrics);
      syncRimHold(metrics);
      syncMisses(metrics);
      state.animationFrame = window.requestAnimationFrame(tick);
    };

    state.animationFrame = window.requestAnimationFrame(tick);
  }

  function updateAccuracy(value) {
    state.accuracyCount += 1;
    state.accuracyAverage = state.accuracyCount === 1
      ? value
      : ((state.accuracyAverage * (state.accuracyCount - 1)) + value) / state.accuracyCount;
  }

  function degradeForInstability() {
    if (state.stability <= 18) {
      setFeedback('The orchestra fell apart. Recenter the tempo and start again.');
      setJudgement('Ensemble Lost');
      stopSession(true);
    }
  }

  function applyLevelSpecials(result, gesture) {
    if (!state.level) return;
    if (state.level.specialMode === 'egmont') {
      const progress = clamp(state.totalBeats / 24, 0, 1);
      const targetRate = 0.92 + (progress * 0.16);
      const distance = Math.abs(getActualPlaybackRate() - targetRate);
      state.specialMeter = clamp(state.specialMeter + (distance < 0.08 ? 5 : -4), 0, 100);
      if (result !== 'miss') {
        applyPlaybackRate(clamp(getActualPlaybackRate() + ((targetRate - getActualPlaybackRate()) * 0.22), 0.72, 1.35));
      }
    }
    if (state.level.specialMode === 'polonaise') {
      if (gesture.confidence >= 0.92) {
        state.score += 45;
        state.specialMeter = clamp(state.specialMeter + 10, 0, 100);
        setFeedback('Elegant pulse. The polonaise feels grounded and noble.');
      } else {
        state.specialMeter = clamp(state.specialMeter - 8, 0, 100);
      }
    }
    if (state.level.specialMode === 'figaro') {
      state.specialMeter = clamp(state.specialMeter + (result === 'perfect' ? 7 : result === 'miss' ? -12 : 2), 0, 100);
    }
    if (state.level.specialMode === 'slavonic') {
      if (gesture.confidence >= 0.85) {
        state.specialMeter = clamp(state.specialMeter + 9, 0, 100);
      } else {
        state.specialMeter = clamp(state.specialMeter - 6, 0, 100);
      }
    }
    if (state.level.specialMode === 'sarabande') {
      if (gesture.confidence >= 0.9) {
        state.score += 55;
        state.specialMeter = clamp(state.specialMeter + 12, 0, 100);
        setFeedback('Controlled and calm. The line stayed suspended and expressive.');
      } else {
        state.specialMeter = clamp(state.specialMeter - 10, 0, 100);
      }
    }
  }

  function stopSession(isFailure) {
    state.sessionActive = false;
    state.countdownActive = false;
    state.isPlayerPlaying = false;
    if (state.player) {
      if (typeof state.player.pauseVideo === 'function') state.player.pauseVideo();
      if (typeof state.player.seekTo === 'function') state.player.seekTo(0, true);
    }
    ['countdownTimer', 'tapFeedbackTimer', 'rimHoldTimer', 'playStartFallbackTimer'].forEach(clearTimer);
    stopSyncLoop();
    stopWaitForPlayLoop();
    resetBeatTracking();
    pulse.classList.remove('is-beating');
    targetRing.classList.remove('is-approaching');
    targetRing.style.transform = 'translate(-50%, -50%) scale(1)';
    rimHoldRing.classList.remove('is-visible');
    tapButton.classList.remove('is-hit-perfect', 'is-hit-good', 'is-hit-miss');
    tapButton.disabled = true;
    stopButton.disabled = true;
    startButton.textContent = 'Start 0:05 Countdown';
    if (!isFailure) {
      setFeedback('Session stopped. Choose a performance and start again when you are ready to conduct.');
      setJudgement('Stopped');
    }
    updateCountdownLabel('Ready window');
  }

  function resetStateForSession() {
    state.countdownActive = false;
    state.playbackRate = 1;
    state.countdownRemainingMs = 5000;
    state.totalBeats = 0;
    state.streak = 0;
    state.score = 0;
    state.accuracyAverage = 0;
    state.accuracyCount = 0;
    state.stability = 100;
    state.specialMeter = 20;
    state.isPlayerPlaying = false;
    state.startTime = 0;
    state.startPerfTime = 0;
    ['playStartFallbackTimer'].forEach(clearTimer);
    stopSyncLoop();
    stopWaitForPlayLoop();
    resetBeatTracking();
    applyPlaybackRate(1);
    renderLevelDetails();
    updateReadout();
    gestureReadout.textContent = 'Wait for the ring to touch the circle rim';
    setJudgement('Ready');
    targetRing.classList.remove('is-approaching');
    targetRing.style.transform = 'translate(-50%, -50%) scale(1)';
    rimHoldRing.classList.remove('is-visible');
    tapButton.classList.remove('is-hit-perfect', 'is-hit-good', 'is-hit-miss');
  }

  function beginGameplay(track) {
    state.sessionActive = true;
    state.countdownActive = false;
    state.isPlayerPlaying = false;
    if (state.player && typeof state.player.playVideo === 'function') {
      if (track.startSeconds > 0 && typeof state.player.seekTo === 'function') {
        state.player.seekTo(track.startSeconds, true);
      }
      state.player.playVideo();
    }

    stopWaitForPlayLoop();
    clearTimer('playStartFallbackTimer');
    tapButton.disabled = false;
    stopButton.disabled = false;
    startButton.textContent = 'Restart Session';
    updateCountdownLabel('Now playing');
    setJudgement('Conduct');
    setFeedback(track.startSeconds > 0
      ? `${track.name} is live. The game skipped to ${formatShortTime(track.startSeconds)} so you start at the orchestra entrance.`
      : `${track.name} is live. Click when the moving ring touches the rim of the circle to keep the orchestra together.`);
    gestureReadout.textContent = 'Wait for the ring to touch the circle rim';

    startAudioSyncAnchor(track);
    startSyncLoop();

    let syncConfirmed = false;

    const confirmSync = () => {
      if (!state.sessionActive || syncConfirmed) return;
      syncConfirmed = true;
      clearTimer('playStartFallbackTimer');
      startAudioSyncAnchor(track);
    };

    const waitForPlay = () => {
      if (!state.sessionActive) {
        state.waitForPlayFrame = null;
        return;
      }

      const playerState = state.player && typeof state.player.getPlayerState === 'function'
        ? state.player.getPlayerState()
        : null;

      if (state.isPlayerPlaying || playerState === 1) {
        confirmSync();
        state.waitForPlayFrame = null;
        return;
      }

      state.waitForPlayFrame = window.requestAnimationFrame(waitForPlay);
    };

    state.playStartFallbackTimer = window.setTimeout(() => {
      if (!state.sessionActive || syncConfirmed) return;
      syncConfirmed = true;
      state.playStartFallbackTimer = null;
      setFeedback(`${track.name} is running. If YouTube starts late, the visual beat will continue and re-sync when playback catches up.`);
    }, 1200);

    state.waitForPlayFrame = window.requestAnimationFrame(waitForPlay);
  }

  function startCountdown(track) {
    clearTimer('countdownTimer');
    state.countdownActive = true;
    state.sessionActive = false;
    state.countdownRemainingMs = 5000;
    tapButton.disabled = true;
    stopButton.disabled = false;
    startButton.textContent = 'Countdown Running';
    updateCountdownLabel('Starting in');
    setJudgement('Get Ready');
    setFeedback(`${track.name} selected. You have 5 seconds to get ready before the game starts.`);

    state.countdownTimer = window.setInterval(() => {
      state.countdownRemainingMs = Math.max(0, state.countdownRemainingMs - 1000);
      updateCountdownLabel('Starting in');
      if (state.countdownRemainingMs === 0) {
        clearTimer('countdownTimer');
        beginGameplay(track);
      }
    }, 1000);
  }

  async function startSession() {
    const track = getSelectedTrack();
    state.level = track.level;
    state.baseBpm = track.bpm;
    resetStateForSession();
    setFeedback(`Loading ${track.name}...`);
    try {
      const player = await ensurePlayer(track.videoId);
      state.currentVideoId = track.videoId;
      if (typeof player.loadVideoById === 'function') player.loadVideoById(track.videoId);
      applyPlaybackRate(1);
      if (typeof player.playVideo === 'function') player.playVideo();
      if (typeof player.pauseVideo === 'function') player.pauseVideo();
      if (typeof player.seekTo === 'function') player.seekTo(track.startSeconds > 0 ? track.startSeconds : 0, true);
      startCountdown(track);
    } catch (error) {
      state.sessionActive = false;
      state.countdownActive = false;
      tapButton.disabled = true;
      stopButton.disabled = true;
      startButton.textContent = 'Start 0:05 Countdown';
      setFeedback('The selected YouTube performance could not start. Try the session again after interacting with the page.');
      setJudgement('Playback Error');
    }
  }

  function registerBeatHit(source) {
    if (!state.sessionActive) return;
    const audioTime = getCurrentAudioTime();
    const beat = getNearestJudgeBeat(audioTime);
    if (!beat) return;

    const signedDelta = beat.signedDeltaSeconds * 1000;
    const timingDelta = beat.timingDeltaMs;
    const confidence = clamp(1 - (timingDelta / hitWindowMs()), 0, 1);
    const timingDirection = signedDelta < 0 ? 'early' : 'late';
    gestureReadout.textContent = timingDelta <= state.level.goodWindow
      ? `${source}: ${Math.round(timingDelta)} ms on beat`
      : `${source}: ${Math.round(timingDelta)} ms ${timingDirection}`;

    let result = 'miss';
    if (timingDelta <= state.level.perfectWindow) result = 'perfect';
    else if (timingDelta <= state.level.goodWindow) result = 'good';
    else if (timingDelta <= hitWindowMs()) result = signedDelta < 0 ? 'early' : 'late';

    state.resolvedBeatIndices.add(beat.index);
    flashTapButton(result);

    if (result === 'perfect') {
      state.streak += 1;
      state.score += 120;
      state.stability = clamp(state.stability + 4, 0, 100);
      state.specialMeter = clamp(state.specialMeter + 5, 0, 100);
      updateAccuracy(100 - ((timingDelta / state.level.perfectWindow) * 18));
      setJudgement('Perfect');
      setFeedback('Excellent baton control. The ensemble is tightly locked to your beat.');
    } else if (result === 'good') {
      state.streak += 1;
      state.score += 80;
      state.stability = clamp(state.stability + 1.5, 0, 100);
      state.specialMeter = clamp(state.specialMeter + 3, 0, 100);
      updateAccuracy(Math.max(82, 100 - ((timingDelta / state.level.goodWindow) * 20)));
      setJudgement('Good');
      setFeedback('Good beat. You were close enough to keep the ensemble together.');
    } else if (result === 'early' || result === 'late') {
      state.score += 40;
      state.specialMeter = clamp(state.specialMeter + 1, 0, 100);
      updateAccuracy(Math.max(60, 100 - ((timingDelta / hitWindowMs()) * 45)));
      setJudgement(result === 'early' ? 'Early' : 'Late');
      setFeedback(result === 'early'
        ? 'A little early, but close. Keep following the rim of the circle.'
        : 'A little late, but close. Try to click right as the ring meets the rim.');
    } else {
      state.streak = 0;
      state.score = Math.max(0, state.score - 25);
      state.stability = clamp(state.stability - 3, 0, 100);
      state.specialMeter = clamp(state.specialMeter - 8, 0, 100);
      updateAccuracy(25);
      setJudgement('Miss');
      setFeedback('The beat timing drifted out of the window. Recover the pulse on the next ring.');
    }

    const adjustment = clamp(((-beat.signedDeltaSeconds) / secondsPerBeat()) * 0.14, -0.08, 0.08);
    if (result !== 'miss') {
      applyPlaybackRate(clamp(getActualPlaybackRate() + adjustment, 0.72, 1.35));
    }

    applyLevelSpecials(result, { confidence });
    updateReadout();
    degradeForInstability();
  }

  tapButton.addEventListener('click', () => {
    registerBeatHit('Click');
  });

  startButton.addEventListener('click', async () => {
    if (state.countdownActive) return;
    await startSession();
  });

  stopButton.addEventListener('click', () => {
    stopSession(false);
  });

  trackSelect.addEventListener('change', () => {
    clearTimer('countdownTimer');
    state.countdownActive = false;
    state.countdownRemainingMs = 5000;
    renderLevelDetails();
    updateReadout();
    if (!state.sessionActive) {
      updateCountdownLabel('Ready window');
      startButton.textContent = 'Start 0:05 Countdown';
      setFeedback(`${getSelectedTrack().name} is selected. Press start to begin the 5 second countdown.`);
      return;
    }
    startSession();
  });

  document.addEventListener('keydown', (event) => {
    if (!state.sessionActive) return;
    const activeTag = document.activeElement && document.activeElement.tagName;
    if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA') return;

    if (event.code === 'Space') {
      event.preventDefault();
      registerBeatHit('Space');
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.sessionActive) {
      stopSession(false);
    }
  });

  renderLevelDetails();
  updateReadout();
})();