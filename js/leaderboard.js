/**
 * Global High Scores & Leaderboard Manager
 */
class LeaderboardManager {
  constructor() {
    this.playerName = safeGetStorage('cricket_player_name', 'SmashMaster');
    this.highScore = parseInt(safeGetStorage('cricket_high_score', '0')) || 0;
    this.totalSixes = parseInt(safeGetStorage('cricket_total_sixes', '0')) || 0;
    
    this.defaultLeaders = [
      { name: 'VIRAT_LEGEND', score: 148, sixes: 22, bat: '⚡ Thunderbolt' },
      { name: 'KING_DHONI', score: 132, sixes: 19, bat: '🔥 Flame Strike' },
      { name: 'GAYLE_FORCE', score: 124, sixes: 18, bat: '🌟 Golden Champion' },
      { name: 'MAXWELL_MAD', score: 110, sixes: 15, bat: '⚡ Thunderbolt' },
      { name: 'AB_MAGIC', score: 98, sixes: 13, bat: '🏏 Classic Willow' },
      { name: 'BAMBA_SIX', score: 86, sixes: 11, bat: '🏏 Classic Willow' },
      { name: 'STRIKER_99', score: 72, sixes: 9, bat: '🏏 Classic Willow' },
      { name: 'AUSS_POWER', score: 64, sixes: 8, bat: '🏏 Classic Willow' },
    ];

    this.loadGlobalRanks();
  }

  setPlayerName(name) {
    if (!name || !name.trim()) return;
    this.playerName = name.trim().substring(0, 12);
    safeSetStorage('cricket_player_name', this.playerName);
    this.saveGlobalRanks();
  }

  loadGlobalRanks() {
    const stored = safeGetStorage('cricket_global_ranks', null);
    if (stored) {
      try {
        this.ranks = JSON.parse(stored);
      } catch (e) {
        this.ranks = [...this.defaultLeaders];
      }
    } else {
      this.ranks = [...this.defaultLeaders];
    }

    this.updateUserInRanks();
  }

  updateUserInRanks() {
    if (this.highScore > 0) {
      let userEntry = this.ranks.find(r => r.isUser);
      if (userEntry) {
        userEntry.score = Math.max(userEntry.score, this.highScore);
        userEntry.name = this.playerName;
        userEntry.sixes = this.totalSixes;
        userEntry.bat = window.shopManager ? window.shopManager.getBat().name : 'Classic Willow';
      } else {
        this.ranks.push({
          name: this.playerName,
          score: this.highScore,
          sixes: this.totalSixes,
          bat: window.shopManager ? window.shopManager.getBat().name : 'Classic Willow',
          isUser: true
        });
      }
    }

    this.ranks.sort((a, b) => b.score - a.score);
    this.saveGlobalRanks();
  }

  saveGlobalRanks() {
    safeSetStorage('cricket_global_ranks', JSON.stringify(this.ranks));
  }

  submitMatchScore(runs, sixes, fours) {
    let isNewHigh = false;

    this.totalSixes += sixes;
    safeSetStorage('cricket_total_sixes', this.totalSixes.toString());

    if (runs > this.highScore) {
      this.highScore = runs;
      safeSetStorage('cricket_high_score', this.highScore.toString());
      isNewHigh = true;
    }

    this.updateUserInRanks();
    return { isNewHigh, highScore: this.highScore };
  }

  getRanks() {
    return this.ranks;
  }
}

window.leaderboardManager = new LeaderboardManager();
