/**
 * UI Manager for Cricket Smash
 * Handles screens, menus, modals, shop rendering, leaderboards, and HUD updates.
 */

class UIManager {
  constructor() {
    this.screens = {
      menu: document.getElementById('main-menu-screen'),
      hud: document.getElementById('hud-screen'),
      shop: document.getElementById('shop-screen'),
      leaderboard: document.getElementById('leaderboard-screen'),
      gameOver: document.getElementById('game-over-screen')
    };

    this.activeShopTab = 'bats';
    this.bindEvents();
    this.updateMenuStats();
  }

  bindBtn(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;

    let lastTime = 0;
    const action = (e) => {
      const now = performance.now();
      if (now - lastTime < 300) return;
      lastTime = now;

      if (window.soundEngine) window.soundEngine.playClick();
      handler(e);
    };

    el.addEventListener('click', action);
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'mouse') {
        action(e);
      }
    });
  }

  bindEvents() {
    // Menu Buttons
    this.bindBtn('btn-play-blitz', () => {
      this.showScreen('hud');
      window.game.startMatch('BLITZ');
    });

    this.bindBtn('btn-play-super-over', () => {
      this.showScreen('hud');
      window.game.startMatch('SUPER_OVER');
    });

    this.bindBtn('btn-shop', () => {
      this.openShop();
    });

    this.bindBtn('btn-leaderboard', () => {
      this.openLeaderboard();
    });

    this.bindBtn('btn-sound-toggle', () => {
      const muted = window.soundEngine.toggleMute();
      const icon = document.getElementById('sound-icon');
      if (icon) icon.textContent = muted ? '🔇' : '🔊';
    });

    // Close Modals
    this.bindBtn('btn-close-shop', () => {
      this.showScreen('menu');
      this.updateMenuStats();
    });

    this.bindBtn('btn-close-leaderboard', () => {
      this.showScreen('menu');
      this.updateMenuStats();
    });

    // Summary Actions
    this.bindBtn('btn-play-again', () => {
      this.showScreen('hud');
      window.game.startMatch(window.game.mode || 'BLITZ');
    });

    this.bindBtn('btn-menu-from-summary', () => {
      this.showScreen('menu');
      this.updateMenuStats();
    });

    // Spacebar / Enter key detection to launch game
    const handleLauncherKey = (e) => {
      const isSpace = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar' || e.keyCode === 32;
      const isEnter = e.code === 'Enter' || e.key === 'Enter' || e.keyCode === 13;

      if (isSpace || isEnter) {
        if (this.screens.menu && !this.screens.menu.classList.contains('hidden')) {
          e.preventDefault();
          if (window.soundEngine) window.soundEngine.playClick();
          this.showScreen('hud');
          window.game.startMatch('BLITZ');
        } else if (this.screens.gameOver && !this.screens.gameOver.classList.contains('hidden')) {
          e.preventDefault();
          if (window.soundEngine) window.soundEngine.playClick();
          this.showScreen('hud');
          window.game.startMatch(window.game.mode || 'BLITZ');
        }
      }
    };

    window.addEventListener('keydown', handleLauncherKey);
    document.addEventListener('keydown', handleLauncherKey);

    // Shop Tabs
    document.querySelectorAll('.shop-tab').forEach(tab => {
      const switchTab = (e) => {
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeShopTab = tab.dataset.tab;
        this.renderShopItems();
      };
      tab.addEventListener('click', switchTab);
      tab.addEventListener('pointerdown', switchTab);
    });

    // Player Name Change
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) {
      nameInput.value = window.leaderboardManager ? window.leaderboardManager.playerName : 'SmashMaster';
      nameInput.addEventListener('change', (e) => {
        if (window.leaderboardManager) window.leaderboardManager.setPlayerName(e.target.value);
        this.renderLeaderboard();
      });
    }
  }

  showScreen(screenKey) {
    Object.keys(this.screens).forEach(key => {
      if (this.screens[key]) {
        if (key === screenKey) {
          this.screens[key].classList.remove('hidden');
        } else {
          this.screens[key].classList.add('hidden');
        }
      }
    });
  }

  updateMenuStats() {
    const hs = document.getElementById('menu-high-score');
    if (hs && window.leaderboardManager) hs.textContent = window.leaderboardManager.highScore;

    const coins = document.getElementById('menu-coins');
    if (coins && window.shopManager) coins.textContent = window.shopManager.coins;
  }

  updateHUD() {
    if (!window.game) return;

    const s = document.getElementById('hud-score');
    if (s) s.textContent = window.game.score;

    const w = document.getElementById('hud-wickets');
    if (w) w.textContent = `${window.game.wickets}/${window.game.maxWickets}`;

    const t = document.getElementById('hud-timer');
    if (t) t.textContent = `${window.game.timeLeft}s`;

    const m = document.getElementById('multiplier-badge');
    if (m) m.textContent = `x${window.game.multiplier.toFixed(1)} POWER`;

    const dots = document.querySelectorAll('.ball-dot');
    dots.forEach((dot, idx) => {
      if (idx < (window.game.ballsFaced % 6)) {
        dot.classList.add('done');
      } else {
        dot.classList.remove('done');
      }
    });
  }

  showCallout(text, sub, type = 'six') {
    const container = document.getElementById('shot-callout');
    const textEl = document.getElementById('callout-text');
    const subEl = document.getElementById('callout-sub');

    if (!container || !textEl || !subEl) return;

    textEl.textContent = text;
    textEl.className = `callout-text ${type}`;
    subEl.textContent = sub;

    container.classList.remove('hidden');

    container.style.animation = 'none';
    container.offsetHeight;
    container.style.animation = 'popup-bounce 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';

    if (this.calloutTimeout) clearTimeout(this.calloutTimeout);
    this.calloutTimeout = setTimeout(() => {
      container.classList.add('hidden');
    }, 1200);
  }

  openShop() {
    const sc = document.getElementById('shop-coins');
    if (sc && window.shopManager) sc.textContent = window.shopManager.coins;
    this.showScreen('shop');
    this.renderShopItems();
  }

  renderShopItems() {
    const grid = document.getElementById('shop-items-grid');
    if (!grid || !window.shopManager) return;
    grid.innerHTML = '';

    const category = this.activeShopTab;
    const items = window.shopManager.catalog[category] || [];
    const unlocked = window.shopManager.unlocked[category] || [];
    const equippedId = window.shopManager.equipped[category.replace(/s$/, '')];

    items.forEach(item => {
      const isUnlocked = unlocked.includes(item.id);
      const isEquipped = item.id === equippedId;

      const card = document.createElement('div');
      card.className = `shop-item-card ${isEquipped ? 'equipped' : ''}`;

      card.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-desc">${item.desc}</div>
        ${item.statBadge ? `<div class="item-stat-badge">${item.statBadge}</div>` : ''}
        <button class="btn-buy-equip ${isEquipped ? 'btn-equipped' : isUnlocked ? 'btn-equip' : 'btn-buy'}">
          ${isEquipped ? 'EQUIPPED' : isUnlocked ? 'EQUIP' : `BUY (${item.price} 🪙)`}
        </button>
      `;

      const btn = card.querySelector('.btn-buy-equip');
      if (btn && !isEquipped) {
        const handleBuy = (e) => {
          e.stopPropagation();
          const result = window.shopManager.buyItem(category, item.id);
          if (result.success) {
            const sc = document.getElementById('shop-coins');
            if (sc) sc.textContent = window.shopManager.coins;
            this.renderShopItems();
          } else {
            alert(result.msg);
          }
        };
        btn.addEventListener('click', handleBuy);
      }

      grid.appendChild(card);
    });
  }

  openLeaderboard() {
    this.showScreen('leaderboard');
    this.renderLeaderboard();
  }

  renderLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list || !window.leaderboardManager) return;
    list.innerHTML = '';

    const ranks = window.leaderboardManager.getRanks();

    ranks.forEach((entry, idx) => {
      const rankNum = idx + 1;
      const item = document.createElement('div');
      item.className = `leader-item ${entry.isUser ? 'is-user' : ''}`;

      let rankClass = '';
      if (rankNum === 1) rankClass = 'top-1';
      if (rankNum === 2) rankClass = 'top-2';
      if (rankNum === 3) rankClass = 'top-3';

      item.innerHTML = `
        <div class="leader-rank ${rankClass}">#${rankNum}</div>
        <div class="leader-info">
          <div class="leader-name">${entry.name} ${entry.isUser ? ' (YOU)' : ''}</div>
          <div class="leader-meta">${entry.sixes || 0} SIXES • ${entry.bat || 'Classic Willow'}</div>
        </div>
        <div class="leader-score">${entry.score}</div>
      `;

      list.appendChild(item);
    });
  }

  showGameOverScreen(data) {
    const r = document.getElementById('summary-runs');
    if (r) r.textContent = data.runs;

    const s = document.getElementById('summary-sixes');
    if (s) s.textContent = data.sixes;

    const f = document.getElementById('summary-fours');
    if (f) f.textContent = data.fours;
    
    const sr = data.ballsFaced > 0 ? Math.round((data.runs / data.ballsFaced) * 100) : 0;
    const srEl = document.getElementById('summary-sr');
    if (srEl) srEl.textContent = `${sr}%`;

    const coinsWon = data.runs * 2;
    const cEl = document.getElementById('summary-coins');
    if (cEl) cEl.textContent = `+${coinsWon} 🪙`;

    const highBanner = document.getElementById('new-high-score-banner');
    if (highBanner) {
      if (data.isNewHigh) {
        highBanner.classList.remove('hidden');
        if (window.soundEngine) window.soundEngine.playCrowdCheer(3.0);
      } else {
        highBanner.classList.add('hidden');
      }
    }

    this.showScreen('gameOver');
  }
}

window.uiManager = new UIManager();
