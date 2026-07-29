/**
 * Global High Scores & Leaderboard Manager
 * Manages player scores, local bests, and dynamic global leaderboard rankings.
 */
class LeaderboardManager {
  constructor() {
    this.playerName = localStorage.getItem('cricket_player_name') || 'SmashMaster';
    this.highScore = parseInt(localStorage.getItem('cricket_high_score')) || 0;
    this.totalSixes = parseInt(localStorage.getItem('cricket_total_sixes')) || 0;
    
    // Default Global Leaderboard template
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
    localStorage.setItem('cricket_player_name', this.playerName);
    this.saveGlobalRanks();
  }

  loadGlobalRanks() {
    const stored = localStorage.getItem('cricket_global_ranks');
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
      // Find or insert user entry
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

    // Sort descending by score
    this.ranks.sort((a, b) => b.score - a.score);
    this.saveGlobalRanks();
  }

  saveGlobalRanks() {
    localStorage.setItem('cricket_global_ranks', JSON.stringify(this.ranks));
  }

  submitMatchScore(runs, sixes, fours) {
    let isNewHigh = false;

    this.totalSixes += sixes;
    localStorage.setItem('cricket_total_sixes', this.totalSixes);

    if (runs > this.highScore) {
      this.highScore = runs;
      localStorage.setItem('cricket_high_score', this.highScore);
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
