(function () {
  if (window.PSOGamification) return;

  var pageShell = document.querySelector('.pso-foundation, .pso-signin-page');
  if (!pageShell) return;

  var backendURI;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    backendURI = 'http://localhost:8324';
  } else {
    backendURI = 'https://wifighters.opencodingsociety.com';
  }
  var progressionEndpoint = backendURI + '/api/pso/progression';

  var LEVELS = [
    { title: 'Beginner', xp: 0 },
    { title: 'Section Member', xp: 120 },
    { title: 'Principal', xp: 280 },
    { title: 'Maestro', xp: 520 }
  ];

  var QUESTS = [
    {
      id: 'welcome-overture',
      title: 'Welcome Overture',
      description: 'Visit your first Poway page while signed in.',
      metric: 'uniquePages',
      goal: 1,
      rewardXp: 30
    },
    {
      id: 'season-scout',
      title: 'Season Scout',
      description: 'Explore three Poway pages.',
      metric: 'uniquePages',
      goal: 3,
      rewardXp: 55
    },
    {
      id: 'section-walkthrough',
      title: 'Section Walkthrough',
      description: 'View four different sections or panels.',
      metric: 'sectionViews',
      goal: 4,
      rewardXp: 65
    },
    {
      id: 'keen-listener',
      title: 'Keen Listener',
      description: 'Play two media or instrument samples.',
      metric: 'mediaInteractions',
      goal: 2,
      rewardXp: 70
    },
    {
      id: 'patron-path',
      title: 'Patron Path',
      description: 'Open two support, ticket, or donation actions.',
      metric: 'supportInteractions',
      goal: 2,
      rewardXp: 50
    },
    {
      id: 'roster-reader',
      title: 'Roster Reader',
      description: 'Search or filter the musician directory twice.',
      metric: 'directoryInteractions',
      goal: 2,
      rewardXp: 60
    },
    {
      id: 'builder-challenge',
      title: 'Builder Challenge',
      description: 'Interact with the orchestra builder.',
      metric: 'builderInteractions',
      goal: 1,
      rewardXp: 80
    },
    {
      id: 'profile-keeper',
      title: 'Profile Keeper',
      description: 'Save a profile, favorite list, member card, or request action.',
      metric: 'profileActions',
      goal: 1,
      rewardXp: 85
    }
  ];

  var UI_STORAGE_KEY = 'pso-progression:ui';
  var currentUser = null;
  var state = null;
  var widget = null;
  var sectionObserver = null;
  var cooldowns = Object.create(null);
  var searchCooldown = null;
  var saveTimer = null;
  var saveInFlight = null;
  var saveQueued = false;
  var pageVisitRecorded = false;
  var widgetCollapsed = false;

  function defaultMetrics() {
    return {
      uniquePages: [],
      sectionViews: [],
      mediaInteractions: 0,
      supportInteractions: 0,
      directoryInteractions: 0,
      builderInteractions: 0,
      profileActions: 0
    };
  }

  function defaultState() {
    return {
      xp: 0,
      completedQuests: [],
      metrics: defaultMetrics(),
      lastUpdatedAt: ''
    };
  }

  function normalizeProgressionState(raw) {
    var baseState = defaultState();
    var merged = Object.assign({}, baseState, raw || {});
    merged.metrics = Object.assign({}, baseState.metrics, raw && raw.metrics ? raw.metrics : {});
    merged.metrics.uniquePages = Array.isArray(merged.metrics.uniquePages) ? merged.metrics.uniquePages : [];
    merged.metrics.sectionViews = Array.isArray(merged.metrics.sectionViews) ? merged.metrics.sectionViews : [];
    merged.completedQuests = Array.isArray(merged.completedQuests) ? merged.completedQuests : [];
    merged.xp = Number(merged.xp) || 0;
    merged.lastUpdatedAt = typeof merged.lastUpdatedAt === 'string' ? merged.lastUpdatedAt : '';
    return merged;
  }

  function progressionPayload() {
    return {
      xp: Number(state && state.xp) || 0,
      completedQuests: Array.isArray(state && state.completedQuests) ? state.completedQuests.slice() : [],
      metrics: Object.assign({}, defaultMetrics(), state && state.metrics ? state.metrics : {}),
      lastUpdatedAt: state && state.lastUpdatedAt ? state.lastUpdatedAt : ''
    };
  }

  function handleProgressionUnauthorized() {
    window.clearTimeout(saveTimer);
    saveTimer = null;
    saveQueued = false;
    currentUser = null;
    state = null;
    pageVisitRecorded = false;
    renderLockedWidget();
  }

  function loadProgression() {
    return fetch(progressionEndpoint, {
      method: 'GET',
      mode: 'cors',
      cache: 'default',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Origin': 'client'
      }
    }).then(function (response) {
      if (response.status === 401) {
        var authError = new Error('Progression unauthorized');
        authError.code = 401;
        throw authError;
      }
      if (!response.ok) {
        throw new Error('Failed to load progression: ' + response.status);
      }
      return response.json();
    }).then(normalizeProgressionState);
  }

  function saveProgression(update) {
    return fetch(progressionEndpoint, {
      method: 'PUT',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Origin': 'client'
      },
      body: JSON.stringify(update)
    }).then(function (response) {
      if (response.status === 401) {
        var authError = new Error('Progression unauthorized');
        authError.code = 401;
        throw authError;
      }
      if (!response.ok) {
        throw new Error('Failed to save progression: ' + response.status);
      }
      return response.json();
    }).then(normalizeProgressionState);
  }

  function flushSave() {
    if (!currentUser || !state) return;
    saveInFlight = saveProgression(progressionPayload()).then(function (serverState) {
      state = serverState;
      renderWidget();
      return serverState;
    }).catch(function (error) {
      if (error && error.code === 401) {
        handleProgressionUnauthorized();
        return null;
      }
      console.warn('Unable to save Poway progression.', error);
      return null;
    }).finally(function () {
      saveInFlight = null;
      if (saveQueued) {
        saveQueued = false;
        queueSave(180);
      }
    });
    return saveInFlight;
  }

  function queueSave(delayMs) {
    if (!currentUser || !state) return;
    if (saveInFlight) {
      saveQueued = true;
      return;
    }
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(function () {
      saveTimer = null;
      flushSave();
    }, typeof delayMs === 'number' ? delayMs : 180);
  }

  function saveState() {
    if (!currentUser || !state) return;
    state.lastUpdatedAt = new Date().toISOString();
    queueSave();
  }

  function loadUiState() {
    try {
      var raw = window.localStorage.getItem(UI_STORAGE_KEY);
      if (!raw) return { collapsed: false };
      var parsed = JSON.parse(raw);
      return {
        collapsed: Boolean(parsed && parsed.collapsed)
      };
    } catch (error) {
      return { collapsed: false };
    }
  }

  function saveUiState() {
    window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ collapsed: widgetCollapsed }));
  }

  function currentMetricValue(metricName) {
    if (!state || !state.metrics) return 0;
    var metric = state.metrics[metricName];
    if (Array.isArray(metric)) return metric.length;
    return Number(metric) || 0;
  }

  function hasCompletedQuest(questId) {
    return state && state.completedQuests.indexOf(questId) !== -1;
  }

  function questProgress(quest) {
    return Math.min(currentMetricValue(quest.metric), quest.goal);
  }

  function completeQuest(quest) {
    if (!state || hasCompletedQuest(quest.id)) return false;
    state.completedQuests.push(quest.id);
    state.xp += quest.rewardXp;
    return true;
  }

  function refreshQuestCompletions() {
    if (!state) return;
    var didChange = false;
    QUESTS.forEach(function (quest) {
      if (!hasCompletedQuest(quest.id) && questProgress(quest) >= quest.goal) {
        didChange = completeQuest(quest) || didChange;
      }
    });
    return didChange;
  }

  function currentLevel() {
    var xp = state ? state.xp : 0;
    var active = LEVELS[0];
    LEVELS.forEach(function (level) {
      if (xp >= level.xp) {
        active = level;
      }
    });
    return active;
  }

  function nextLevel() {
    var xp = state ? state.xp : 0;
    for (var index = 0; index < LEVELS.length; index += 1) {
      if (LEVELS[index].xp > xp) return LEVELS[index];
    }
    return null;
  }

  function levelProgressPercent() {
    if (!state) return 0;
    var level = currentLevel();
    var next = nextLevel();
    if (!next) return 100;
    var span = next.xp - level.xp;
    if (!span) return 100;
    return Math.max(0, Math.min(100, ((state.xp - level.xp) / span) * 100));
  }

  function overallQuestPercent() {
    if (!state) return 0;
    if (!QUESTS.length) return 0;
    return Math.round((state.completedQuests.length / QUESTS.length) * 100);
  }

  function derivedBadges() {
    if (!state) return [];
    var badges = [];
    if (state.metrics.uniquePages.length >= 1) badges.push('First Visit');
    if (state.metrics.uniquePages.length >= 3) badges.push('Season Scout');
    if (state.metrics.mediaInteractions >= 2) badges.push('Keen Listener');
    if (state.metrics.directoryInteractions >= 2) badges.push('Roster Reader');
    if (state.metrics.builderInteractions >= 1) badges.push('Stage Planner');
    if (state.metrics.supportInteractions >= 2) badges.push('Patron Pulse');
    if (state.completedQuests.length >= 4) badges.push('Principal Focus');
    if (currentLevel().title === 'Maestro') badges.push('Maestro');
    return badges.slice(0, 4);
  }

  function withCooldown(key, waitMs) {
    var now = Date.now();
    if (cooldowns[key] && now - cooldowns[key] < waitMs) return false;
    cooldowns[key] = now;
    return true;
  }

  function recordUnique(metricName, key, xpAward) {
    if (!currentUser || !state || !key) return;
    var items = state.metrics[metricName];
    if (!Array.isArray(items)) return;
    if (items.indexOf(key) !== -1) return;
    items.push(key);
    state.xp += xpAward;
    refreshQuestCompletions();
    saveState();
    renderWidget();
  }

  function incrementMetric(metricName, amount, xpAward, cooldownKey, waitMs) {
    if (!currentUser || !state) return;
    if (cooldownKey && !withCooldown(cooldownKey, waitMs || 900)) return;
    state.metrics[metricName] = (Number(state.metrics[metricName]) || 0) + amount;
    state.xp += xpAward;
    refreshQuestCompletions();
    saveState();
    renderWidget();
  }

  function buildQuestMarkup(quest) {
    var progress = questProgress(quest);
    var completed = hasCompletedQuest(quest.id);
    var percent = Math.round((progress / quest.goal) * 100);
    return '<article class="pso-gamify-quest' + (completed ? ' is-complete' : '') + '">' +
      '<div class="pso-gamify-quest-head"><strong>' + quest.title + '</strong><span>' + progress + ' / ' + quest.goal + '</span></div>' +
      '<p>' + quest.description + '</p>' +
      '<div class="pso-gamify-mini-track"><span style="width:' + percent + '%"></span></div>' +
    '</article>';
  }

  function ensureWidget() {
    if (widget) return widget;
    widget = document.createElement('aside');
    widget.className = 'pso-gamify-shell';
    widget.setAttribute('aria-live', 'polite');
    widget.addEventListener('click', function (event) {
      var toggle = event.target.closest('[data-pso-gamify-toggle]');
      if (!toggle) return;
      var shouldCollapse = toggle.getAttribute('data-pso-gamify-toggle') === 'collapse';
      setCollapsed(shouldCollapse);
    });
    document.body.appendChild(widget);
    return widget;
  }

  function setCollapsed(nextValue) {
    widgetCollapsed = Boolean(nextValue);
    saveUiState();
    renderWidget();
  }

  function renderShell(content) {
    var shell = ensureWidget();
    shell.classList.toggle('is-collapsed', widgetCollapsed);
    shell.innerHTML = content;
    return shell;
  }

  function renderLockedWidget() {
    if (widgetCollapsed) {
      renderShell(
        '<button class="pso-gamify-reopen" type="button" data-pso-gamify-toggle="expand" aria-expanded="false" aria-label="Open Poway progression">Open Poway Progression</button>'
      );
      return;
    }

    renderShell(
      '<div class="pso-gamify-card is-locked">' +
        '<div class="pso-gamify-head">' +
          '<div>' +
            '<span class="pso-gamify-kicker">Poway Progression</span>' +
            '<h3>Sign In To Save XP</h3>' +
          '</div>' +
          '<button class="pso-gamify-toggle" type="button" data-pso-gamify-toggle="collapse" aria-expanded="true" aria-label="Close Poway progression">Hide</button>' +
        '</div>' +
        '<p>XP, levels, badges, and quest progress only persist for signed-in users.</p>' +
        '<div class="pso-gamify-track is-muted"><span style="width:0%"></span></div>' +
        '<div class="pso-gamify-locked-actions">' +
          '<a class="pso-gamify-link" href="/powayorchestra/signin/">Open Sign In</a>' +
        '</div>' +
      '</div>'
    );
  }

  function renderWidget() {
    if (!currentUser || !state) {
      renderLockedWidget();
      return;
    }

    if (widgetCollapsed) {
      renderShell(
        '<button class="pso-gamify-reopen" type="button" data-pso-gamify-toggle="expand" aria-expanded="false" aria-label="Open Poway progression">' +
          '<span>Poway Progression</span><strong>' + state.xp + ' XP</strong>' +
        '</button>'
      );
      return;
    }

    var level = currentLevel();
    var next = nextLevel();
    var badges = derivedBadges();
    var openQuests = QUESTS.slice().sort(function (left, right) {
      return questProgress(right) - questProgress(left);
    }).slice(0, 4);

    renderShell(
      '<div class="pso-gamify-card">' +
        '<div class="pso-gamify-head">' +
          '<div>' +
            '<span class="pso-gamify-kicker">Poway Progression</span>' +
            '<h3>' + level.title + '</h3>' +
          '</div>' +
          '<div class="pso-gamify-head-actions">' +
            '<div class="pso-gamify-xp">' + state.xp + ' XP</div>' +
            '<button class="pso-gamify-toggle" type="button" data-pso-gamify-toggle="collapse" aria-expanded="true" aria-label="Close Poway progression">Hide</button>' +
          '</div>' +
        '</div>' +
        '<p class="pso-gamify-copy">' + escapeHtml(currentUser.name || currentUser.uid || 'Member') + ' is building momentum across the site.</p>' +
        '<div class="pso-gamify-group">' +
          '<div class="pso-gamify-row"><span>Level Progress</span><span>' + (next ? (next.xp - state.xp) + ' XP to ' + next.title : 'Top Level Reached') + '</span></div>' +
          '<div class="pso-gamify-track"><span style="width:' + levelProgressPercent() + '%"></span></div>' +
        '</div>' +
        '<div class="pso-gamify-group">' +
          '<div class="pso-gamify-row"><span>Quest Progress</span><span>' + state.completedQuests.length + ' / ' + QUESTS.length + '</span></div>' +
          '<div class="pso-gamify-track is-secondary"><span style="width:' + overallQuestPercent() + '%"></span></div>' +
        '</div>' +
        '<div class="pso-gamify-badges">' +
          (badges.length ? badges.map(function (badge) {
            return '<span class="pso-gamify-badge">' + badge + '</span>';
          }).join('') : '<span class="pso-gamify-badge is-muted">No badges yet</span>') +
        '</div>' +
        '<div class="pso-gamify-quests">' + openQuests.map(buildQuestMarkup).join('') + '</div>' +
      '</div>'
    );
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sectionKey(node) {
    if (!node) return '';
    if (node.id) return node.id;
    if (node.dataset && node.dataset.sectionId) return node.dataset.sectionId;
    var heading = node.querySelector('h1, h2, h3, h4');
    if (heading && heading.textContent) return heading.textContent.trim().toLowerCase();
    return '';
  }

  function setupSectionTracking() {
    if (sectionObserver) return;
    var observedNodes = document.querySelectorAll(
      '.pso-foundation section[id], .pso-conductor-detail-card, .pso-signin-card, .pso-signin-panel, .pso-profile-card, .pso-member-profile-panel'
    );
    if (!observedNodes.length) return;

    sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.45) return;
        var key = sectionKey(entry.target);
        if (!key) return;
        recordUnique('sectionViews', key, 8);
        sectionObserver.unobserve(entry.target);
      });
    }, { threshold: [0.45] });

    Array.prototype.forEach.call(observedNodes, function (node) {
      sectionObserver.observe(node);
    });
  }

  function setupClickTracking() {
    document.addEventListener('click', function (event) {
      var target = event.target;
      var mediaButton = target.closest('[data-family-audio-player-toggle], .sample-play-sample-btn[data-audio], #pso-member-profile-sample, [data-media-card], .media-video-card, [data-hero-video-audio-toggle]');
      if (mediaButton) {
        incrementMetric('mediaInteractions', 1, 10, 'media:' + (mediaButton.id || mediaButton.className), 1000);
      }

      var supportLink = target.closest('a[href*="/tickets/"], a[href*="/donate/"], a[href*="/support/"], a[href*="ticketsearch.com"]');
      if (supportLink) {
        recordUnique('uniquePages', location.pathname, 0);
        incrementMetric('supportInteractions', 1, 12, 'support:' + supportLink.getAttribute('href'), 800);
      }

      var builderAction = target.closest('[data-builder-add], [data-builder-zone], [data-builder-reset], [data-builder-card]');
      if (builderAction) {
        incrementMetric('builderInteractions', 1, 14, 'builder-action', 900);
      }

      var profileAction = target.closest('#pso-profile-save, #pso-favorites-save, #pso-member-card-save, #pso-submit-button, #pso-signup-button, [data-request-action], [data-request-card-create]');
      if (profileAction) {
        incrementMetric('profileActions', 1, 16, 'profile-action:' + (profileAction.id || profileAction.dataset.requestAction || 'generic'), 900);
      }

      var directoryAction = target.closest('.musician-section-chip, .instrument-card, .musician-member-card');
      if (directoryAction) {
        incrementMetric('directoryInteractions', 1, 8, 'directory:' + (directoryAction.getAttribute('data-section-id') || directoryAction.className), 700);
      }
    }, true);
  }

  function setupInputTracking() {
    var searchInput = document.querySelector('[data-musician-search]');
    if (!searchInput) return;
    searchInput.addEventListener('input', function () {
      if (!currentUser || !state) return;
      window.clearTimeout(searchCooldown);
      searchCooldown = window.setTimeout(function () {
        var value = String(searchInput.value || '').trim().toLowerCase();
        if (value.length < 2) return;
        recordUnique('sectionViews', 'search:' + value, 0);
        incrementMetric('directoryInteractions', 1, 10, 'directory-search:' + value, 0);
      }, 320);
    });
  }

  function hydrateAuthenticatedUser(user) {
    if (!user || !user.uid) {
      handleProgressionUnauthorized();
      return Promise.resolve(null);
    }

    if (!currentUser || currentUser.uid !== user.uid) {
      pageVisitRecorded = false;
    }
    currentUser = user;
    return loadProgression().then(function (serverState) {
      if (!currentUser || currentUser.uid !== user.uid) return null;
      state = serverState;
      setupSectionTracking();
      renderWidget();
      if (!pageVisitRecorded) {
        pageVisitRecorded = true;
        recordUnique('uniquePages', location.pathname, 18);
      }
      return state;
    }).catch(function (error) {
      if (error && error.code === 401) {
        handleProgressionUnauthorized();
        return null;
      }
      console.warn('Unable to load Poway progression.', error);
      state = defaultState();
      setupSectionTracking();
      renderWidget();
      if (!pageVisitRecorded) {
        pageVisitRecorded = true;
        recordUnique('uniquePages', location.pathname, 18);
      }
      return state;
    });
  }

  function fetchIdentity() {
    return fetch(backendURI + '/api/id', {
      method: 'GET',
      mode: 'cors',
      cache: 'default',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Origin': 'client'
      }
    }).then(function (response) {
      if (!response.ok) throw new Error('Not signed in');
      return response.json();
    }).then(function (user) {
      return hydrateAuthenticatedUser(user).then(function () {
        return user;
      });
    }).catch(function (error) {
      if (error && error.code === 401) {
        handleProgressionUnauthorized();
        return null;
      }
      throw error;
    }).catch(function () {
      handleProgressionUnauthorized();
      return null;
    });
  }

  function track(metricName, payload) {
    if (!currentUser || !state) return;
    if (metricName === 'profile-action') {
      incrementMetric('profileActions', 1, 16, 'profile-manual:' + (payload && payload.key || 'default'), 700);
      return;
    }
    if (metricName === 'media') {
      incrementMetric('mediaInteractions', 1, 10, 'media-manual:' + (payload && payload.key || 'default'), 700);
      return;
    }
    if (metricName === 'builder') {
      incrementMetric('builderInteractions', 1, 14, 'builder-manual:' + (payload && payload.key || 'default'), 700);
      return;
    }
  }

  function init() {
    widgetCollapsed = loadUiState().collapsed;
    ensureWidget();
    renderLockedWidget();
    setupClickTracking();
    setupInputTracking();
    fetchIdentity();
  }

  window.PSOGamification = {
    init: init,
    refreshIdentity: fetchIdentity,
    hydrateAuthenticatedUser: hydrateAuthenticatedUser,
    track: track
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());