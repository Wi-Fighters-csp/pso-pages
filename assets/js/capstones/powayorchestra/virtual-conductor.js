(function () {
  const root = document.querySelector('[data-virtual-conductor-root]');
  if (!root) return;

  const trackSelect = document.getElementById('vc-track-select');
  const startButton = document.getElementById('vc-start');
  const stopButton = document.getElementById('vc-stop');
  const tapButton = document.getElementById('vc-tap');
  const pulse = document.getElementById('vc-pulse');
  const feedback = document.getElementById('vc-feedback');
  const trackName = document.getElementById('vc-track-name');
  const tempo = document.getElementById('vc-tempo');
  const rate = document.getElementById('vc-rate');
  const accuracy = document.getElementById('vc-accuracy');
  const streak = document.getElementById('vc-streak');

  if (!trackSelect || !startButton || !stopButton || !tapButton || !pulse || !feedback) return;

  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';

  let baseBpm = 76;
  let playbackRate = 1;
  let lastTapAt = 0;
  let sessionActive = false;
  let streakCount = 0;
  let averageAccuracy = 0;
  let measuredTapCount = 0;
  let pulseTimer = null;
  let tapFlashTimer = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getSelectedTrack() {
    const option = trackSelect.options[trackSelect.selectedIndex];
    return {
      name: option ? option.textContent.trim() : 'Strings Ensemble',
      src: option ? option.dataset.audioSrc : '',
      bpm: Number(option ? option.dataset.bpm : 76) || 76
    };
  }

  function updateReadout() {
    const currentTempo = Math.round(baseBpm * playbackRate);
    const activeTrack = getSelectedTrack();
    trackName.textContent = activeTrack.name;
    tempo.textContent = `${currentTempo} BPM`;
    rate.textContent = `${playbackRate.toFixed(2)}x`;
    accuracy.textContent = measuredTapCount > 0 ? `${Math.round(averageAccuracy)}%` : '--';
    streak.textContent = String(streakCount);
  }

  function pulseBeat() {
    pulse.classList.remove('is-beating');
    void pulse.offsetWidth;
    pulse.classList.add('is-beating');
  }

  function restartPulse() {
    window.clearInterval(pulseTimer);
    if (!sessionActive) return;
    pulseBeat();
    const interval = 60000 / (baseBpm * playbackRate);
    pulseTimer = window.setInterval(pulseBeat, interval);
  }

  function setFeedback(message) {
    feedback.textContent = message;
  }

  function resetMetrics() {
    playbackRate = 1;
    lastTapAt = 0;
    streakCount = 0;
    averageAccuracy = 0;
    measuredTapCount = 0;
    audio.playbackRate = playbackRate;
    updateReadout();
  }

  async function startSession() {
    const track = getSelectedTrack();
    baseBpm = track.bpm;
    audio.src = track.src;
    audio.currentTime = 0;
    resetMetrics();

    try {
      await audio.play();
      sessionActive = true;
      tapButton.disabled = false;
      stopButton.disabled = false;
      startButton.textContent = 'Restart Session';
      setFeedback(`${track.name} is live. Hold a steady beat and the orchestra will follow your timing.`);
      restartPulse();
    } catch (error) {
      sessionActive = false;
      tapButton.disabled = true;
      stopButton.disabled = true;
      setFeedback('Audio could not start automatically. Try starting the session again after interacting with the page.');
    }
  }

  function stopSession() {
    sessionActive = false;
    lastTapAt = 0;
    audio.pause();
    audio.currentTime = 0;
    window.clearInterval(pulseTimer);
    pulse.classList.remove('is-beating');
    tapButton.disabled = true;
    stopButton.disabled = true;
    startButton.textContent = 'Start Session';
    resetMetrics();
    setFeedback('Session stopped. Choose a recording and start again when you are ready to conduct.');
  }

  function registerTap() {
    if (!sessionActive) return;

    const now = window.performance.now();
    pulseBeat();
    tapButton.classList.add('is-active');
    window.clearTimeout(tapFlashTimer);
    tapFlashTimer = window.setTimeout(() => {
      tapButton.classList.remove('is-active');
    }, 120);

    if (!lastTapAt) {
      lastTapAt = now;
      setFeedback('Beat established. Keep tapping steadily so the orchestra can lock to your tempo.');
      return;
    }

    const expectedInterval = 60000 / (baseBpm * playbackRate);
    const tapInterval = now - lastTapAt;
    const delta = tapInterval - expectedInterval;
    const normalizedError = clamp(Math.abs(delta) / expectedInterval, 0, 1.2);
    const tapAccuracy = Math.max(0, 100 - normalizedError * 100);

    lastTapAt = now;
    measuredTapCount += 1;
    averageAccuracy = measuredTapCount === 1
      ? tapAccuracy
      : ((averageAccuracy * (measuredTapCount - 1)) + tapAccuracy) / measuredTapCount;

    if (Math.abs(delta) <= expectedInterval * 0.08) {
      streakCount += 1;
      setFeedback('Locked in. The orchestra is right with you.');
    } else if (delta < 0) {
      streakCount = 0;
      setFeedback('You pushed ahead of the beat. The orchestra is accelerating to match you.');
    } else {
      streakCount = 0;
      setFeedback('You drifted behind the beat. The orchestra is relaxing back with your timing.');
    }

    const adjustment = clamp((-delta / expectedInterval) * 0.12, -0.08, 0.08);
    playbackRate = clamp(playbackRate + adjustment, 0.72, 1.35);
    audio.playbackRate = playbackRate;
    updateReadout();
    restartPulse();
  }

  trackSelect.addEventListener('change', () => {
    const track = getSelectedTrack();
    baseBpm = track.bpm;
    updateReadout();
    if (!sessionActive) {
      setFeedback(`${track.name} is selected. Start the session to begin conducting.`);
      return;
    }
    startSession();
  });

  startButton.addEventListener('click', () => {
    startSession();
  });

  stopButton.addEventListener('click', () => {
    stopSession();
  });

  tapButton.addEventListener('click', () => {
    registerTap();
  });

  document.addEventListener('keydown', (event) => {
    if (!sessionActive) return;
    if (event.code !== 'Space') return;
    const activeTag = document.activeElement && document.activeElement.tagName;
    if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA') return;
    event.preventDefault();
    registerTap();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && sessionActive) {
      stopSession();
    }
  });

  updateReadout();
})();