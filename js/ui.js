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

  bindEvents() {
    // Menu Buttons
    document.getElementById('btn-play-blitz').addEventListener('click', () => {
      window.soundEngine.playClick();
      this.showScreen('hud');
      window.game.startMatch('BLITZ');
    });

    document.getElementById('btn-play-super-over').addEventListener('click', () => {
      window.soundEngine.playClick();
      this.showScreen('hud');
      window.game.startMatch('SUPER_OVER');
    });

    document.getElementById('btn-shop').addEventListener('click', () => {
      window.soundEngine.playClick();
      this.openShop();
    });

    document.getElementById('btn-leaderboard').addEventListener('click', () => {
      window.soundEngine.playClick();
      this.openLeaderboard();
    });

    document.getElementById('btn-sound-toggle').addEventListener('click', () => {
      const muted = window.soundEngine.toggleMute();
      document.getElementById('sound-icon').textContent = muted ? '🔇' : '🔊';
    });

    // Close Modals
    document.getElementById('btn-close-shop').addEventListener('click', () => {
      window.soundEngine.playClick();
      this.showScreen('menu');
      this.updateMenuStats();
    });

    document.getElementById('btn-close-leaderboard').addEventListener('click', () => {
      window.soundEngine.playClick();
      this.showScreen('menu');
      this.updateMenuStats();
    });

    // Shop Tabs
    document.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.activeShopTab = e.target.dataset.tab;
        this.renderShopItems();
      });
    });

    // Player Name Change
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) {
      nameInput.value = window.leaderboardManager.playerName;
      nameInput.addEventListener('change', (e) => {
        window.leaderboardManager.setPlayerName(e.target.value);
        this.renderLeaderboard();
      });
    }

    // Summary Actions
    document.getElementById('btn-play-again').addEventListener('click', () => {
      window.soundEngine.playClick();
      this.showScreen('hud');
      window.game.startMatch(window.game.mode || 'BLITZ');
    });

    document.getElementById('btn-menu-from-summary').addEventListener('click', () => {
      window.soundEngine.playClick();
      this.showScreen('menu');
      this.updateMenuStats();
    });
  }

  showScreen(screenKey) {
    Object.keys(this.screens).forEach(key => {
      if (key === screenKey) {
        this.screens[key].classList.remove('hidden');
      } else {
        this.screens[key].classList.add('hidden');
      }
    });
  }

  updateMenuStats() {
    document.getElementById('menu-high-score').textContent = window.leaderboardManager.highScore;
    document.getElementById('menu-coins').textContent = window.shopManager.coins;
  }

  updateHUD() {
    if (!window.game) return;

    document.getElementById('hud-score').textContent = window.game.score;
    document.getElementById('hud-wickets').textContent = `${window.game.wickets}/${window.game.maxWickets}`;
    document.getElementById('hud-timer').textContent = `${window.game.timeLeft}s`;
    document.getElementById('multiplier-badge').textContent = `x${window.game.multiplier.toFixed(1)} POWER`;

    // Balls tracker update
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

    textEl.textContent = text;
    textEl.className = `callout-text ${type}`;
    subEl.textContent = sub;

    container.classList.remove('hidden');

    // Trigger re-animation
    container.style.animation = 'none';
    container.offsetHeight; // trigger reflow
    container.style.animation = 'popup-bounce 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';

    if (this.calloutTimeout) clearTimeout(this.calloutTimeout);
    this.calloutTimeout = setTimeout(() => {
      container.classList.add('hidden');
    }, 1200);
  }

  openShop() {
    document.getElementById('shop-coins').textContent = window.shopManager.coins;
    this.showScreen('shop');
    this.renderShopItems();
  }

  renderShopItems() {
    const grid = document.getElementById('shop-items-grid');
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
      if (!isEquipped) {
        btn.addEventListener('click', () => {
          const result = window.shopManager.buyItem(category, item.id);
          if (result.success) {
            document.getElementById('shop-coins').textContent = window.shopManager.coins;
            this.renderShopItems();
          } else {
            alert(result.msg);
          }
        });
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
    document.getElementById('summary-runs').textContent = data.runs;
    document.getElementById('summary-sixes').textContent = data.sixes;
    document.getElementById('summary-fours').textContent = data.fours;
    
    const sr = data.ballsFaced > 0 ? Math.round((data.runs / data.ballsFaced) * 100) : 0;
    document.getElementById('summary-sr').textContent = `${sr}%`;

    const coinsWon = data.runs * 2;
    document.getElementById('summary-coins').textContent = `+${coinsWon} 🪙`;

    const highBanner = document.getElementById('new-high-score-banner');
    if (data.isNewHigh) {
      highBanner.classList.remove('hidden');
      window.soundEngine.playCrowdCheer(3.0);
    } else {
      highBanner.classList.add('hidden');
    }

    this.showScreen('gameOver');
  }
}

window.uiManager = new UIManager();
