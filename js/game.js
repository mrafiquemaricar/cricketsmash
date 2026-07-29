/**
 * 60 FPS Canvas Game Engine for Cricket Smash
 * Manages 3D-perspective pitch rendering, bowler AI, batsman controls, timing mechanics, ball physics, camera, and particle effects.
 */

class CricketGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAME_OVER
    this.mode = 'BLITZ'; // BLITZ (60s), SUPER_OVER (6 balls)

    // Game stats
    this.score = 0;
    this.wickets = 0;
    this.maxWickets = 3;
    this.sixes = 0;
    this.fours = 0;
    this.singles = 0;
    this.ballsFaced = 0;
    this.timeLeft = 60;
    this.multiplier = 1.0;
    this.consecutiveHits = 0;
    this.wicketArmorUsed = false;

    // World perspective dimensions
    this.width = 400;
    this.height = 700;

    // Default Non-Null Entities for Immediate Render
    this.stumps = { x: 200, y: 610, bailsOn: true };
    this.bowler = { x: 200, y: 120, state: 'IDLE', runTimer: 0 };
    this.batsman = { x: 200, y: 590, animState: 'READY', swingAngle: 0, swingProgress: 0 };
    this.ball = { x: 200, y: 130, z: 0, vx: 0, vy: 0, vz: 0, state: 'WAITING' };
    this.particles = [];
    this.callouts = [];

    // Input & Gesture Tracking
    this.touchStart = null;
    this.isSwiping = false;
    this.shotExecuted = false;
    this.pendingShot = null;

    // Camera Shake / Zoom
    this.cameraShake = 0;
    this.cameraZoom = 1.0;

    this.bindEvents();
    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : 400;
    const h = rect.height > 0 ? rect.height : 700;

    this.canvas.width = w * window.devicePixelRatio;
    this.canvas.height = h * window.devicePixelRatio;
    this.width = w;
    this.height = h;

    this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

    // Update entity positions relative to canvas size
    if (this.stumps) {
      this.stumps.x = this.width / 2;
      this.stumps.y = this.height - 90;
    }
    if (this.bowler) {
      this.bowler.x = this.width / 2;
      if (this.bowler.state === 'IDLE') this.bowler.y = 120;
    }
    if (this.batsman) {
      this.batsman.x = this.width / 2;
      this.batsman.y = this.height - 110;
    }
    if (this.ball && this.ball.state === 'WAITING') {
      this.ball.x = this.width / 2;
      this.ball.y = 130;
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    // Unified pointer/mouse/touch listener attached to window
    const handleStart = (e) => {
      if (this.state !== 'PLAYING') return;
      if (e.target && (e.target.tagName === 'BUTTON' || e.target.closest('button'))) return;
      
      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      this.touchStart = { x: clientX, y: clientY, time: performance.now() };
      this.isSwiping = true;
    };

    const handleEnd = (e) => {
      if (this.state !== 'PLAYING' || !this.touchStart) return;
      if (e.target && (e.target.tagName === 'BUTTON' || e.target.closest('button'))) return;

      const clientX = e.clientX || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0);
      const clientY = e.clientY || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : 0);

      const dx = clientX - this.touchStart.x;
      const dy = clientY - this.touchStart.y;
      const dist = Math.hypot(dx, dy);

      let shotDirection = 'STRAIGHT';
      if (dist > 20) {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < -135 || angle > 135) shotDirection = 'LEFT';
        else if (angle > -45 && angle < 45) shotDirection = 'RIGHT';
        else if (angle < -45 && angle >= -135) shotDirection = 'UP';
        else shotDirection = 'DOWN';
      }

      this.playShot(shotDirection);
      this.isSwiping = false;
      this.touchStart = null;
    };

    window.addEventListener('pointerdown', handleStart);
    window.addEventListener('pointerup', handleEnd);

    // Cross-Browser Keyboard Controls
    const handleGameKey = (e) => {
      if (this.state !== 'PLAYING') return;

      const code = e.code || '';
      const key = (e.key || '').toLowerCase();
      const keyCode = e.keyCode || 0;

      const isUp = code === 'Space' || code === 'Enter' || code === 'ArrowUp' || code === 'KeyW' || key === ' ' || key === 'spacebar' || key === 'enter' || key === 'w' || key === 'arrowup' || keyCode === 32 || keyCode === 13 || keyCode === 38;
      const isLeft = code === 'ArrowLeft' || code === 'KeyA' || key === 'a' || key === 'arrowleft' || keyCode === 37;
      const isRight = code === 'ArrowRight' || code === 'KeyD' || key === 'd' || key === 'arrowright' || keyCode === 39;
      const isDown = code === 'ArrowDown' || code === 'KeyS' || key === 's' || key === 'arrowdown' || keyCode === 40;

      if (isUp) {
        e.preventDefault();
        this.playShot('UP');
      } else if (isLeft) {
        e.preventDefault();
        this.playShot('LEFT');
      } else if (isRight) {
        e.preventDefault();
        this.playShot('RIGHT');
      } else if (isDown) {
        e.preventDefault();
        this.playShot('DOWN');
      }
    };

    window.addEventListener('keydown', handleGameKey);
    document.addEventListener('keydown', handleGameKey);
  }

  startMatch(mode = 'BLITZ') {
    this.mode = mode;
    this.state = 'PLAYING';
    this.score = 0;
    this.wickets = 0;
    this.sixes = 0;
    this.fours = 0;
    this.singles = 0;
    this.ballsFaced = 0;
    this.timeLeft = 60;
    this.multiplier = 1.0;
    this.consecutiveHits = 0;
    this.wicketArmorUsed = false;
    this.particles = [];

    this.resizeCanvas();

    // Apply Helmet stats
    const helm = window.shopManager ? window.shopManager.getHelmet() : { id: 'blue_helm' };
    if (helm.id === 'carbon_helm') {
      this.maxWickets = 4;
    } else {
      this.maxWickets = 3;
    }

    if (helm.id === 'golden_helm') {
      this.multiplier = 1.2;
    }

    this.bowler = {
      x: this.width / 2,
      y: 120,
      state: 'RUNNING',
      runTimer: 0
    };

    this.batsman = {
      x: this.width / 2,
      y: this.height - 110,
      animState: 'READY',
      swingAngle: 0,
      swingProgress: 0
    };

    this.stumps = {
      x: this.width / 2,
      y: this.height - 90,
      bailsOn: true
    };

    this.ball = null;

    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.mode === 'BLITZ') {
      this.timerInterval = setInterval(() => {
        if (this.state === 'PLAYING') {
          this.timeLeft--;
          if (this.timeLeft <= 5 && this.timeLeft > 0) {
            window.soundEngine.playBeep(false);
          }
          if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            window.soundEngine.playBeep(true);
            this.endMatch();
          }
          if (window.uiManager) window.uiManager.updateHUD();
        }
      }, 1000);
    }

    this.nextDelivery();
    if (window.uiManager) window.uiManager.updateHUD();
  }

  nextDelivery() {
    if (this.state !== 'PLAYING') return;

    this.shotExecuted = false;
    this.pendingShot = null;
    if (this.batsman) {
      this.batsman.animState = 'READY';
      this.batsman.swingProgress = 0;
    }

    if (this.bowler) {
      this.bowler.state = 'RUNNING';
      this.bowler.runTimer = 0;
    }

    const types = ['FAST', 'OUTSWING', 'INSWING', 'YORKER', 'BOUNCER', 'SLOW'];
    const selectedType = types[Math.floor(Math.random() * types.length)];
    
    let targetX = this.width / 2 + (Math.random() * 40 - 20);
    let targetY = this.height - 240 + (Math.random() * 40 - 20);
    
    let speed = 7.5 + Math.random() * 2.5;
    if (selectedType === 'SLOW') speed = 5.0;
    if (selectedType === 'YORKER') targetY = this.height - 150;

    this.ball = {
      x: this.width / 2,
      y: 130,
      z: 20,
      vx: 0,
      vy: 0,
      vz: 0,
      targetX: targetX,
      targetY: targetY,
      speed: speed,
      type: selectedType,
      state: 'WAITING'
    };
  }

  playShot(direction = 'STRAIGHT') {
    if (!this.ball) return;
    if (this.ball.state === 'HIT' || this.ball.state === 'OUT') return;

    if (this.batsman) {
      this.batsman.animState = 'SWINGING';
      this.batsman.swingProgress = 0;
    }

    if (this.ball.state === 'WAITING') {
      this.pendingShot = direction;
      return;
    }

    if (this.shotExecuted) return;

    this.shotExecuted = true;
    this.ballsFaced++;

    const creaseY = (this.batsman ? this.batsman.y : (this.height - 110)) - 20;
    const distToCrease = Math.abs(this.ball.y - creaseY);

    const bat = (window.shopManager && typeof window.shopManager.getBat === 'function') ? window.shopManager.getBat() : { powerBoost: 1.0 };
    const powerMultiplier = bat.powerBoost || 1.0;

    let quality = 'MISS';
    if (distToCrease <= 40) quality = 'PERFECT';
    else if (distToCrease <= 75) quality = 'GREAT';
    else if (distToCrease <= 115) quality = 'GOOD';
    else if (distToCrease <= 145) quality = 'EDGE';
    else quality = 'MISS';

    if (quality !== 'MISS') {
      this.ball.state = 'HIT';
      this.consecutiveHits++;
      if (this.consecutiveHits >= 3) this.multiplier = Math.min(3.0, this.multiplier + 0.5);

      let runs = 0;
      if (quality === 'PERFECT') {
        runs = 6;
        this.sixes++;
        window.soundEngine.playHit('six');
        this.triggerCameraEffect('SIX');
        if (window.uiManager) window.uiManager.showCallout('SIX!', `PERFECT TIMING • ${Math.floor(100 + Math.random() * 25)}m`, 'six');

        this.ball.vx = (Math.random() * 4 - 2 + (direction === 'LEFT' ? -6 : direction === 'RIGHT' ? 6 : 0)) * powerMultiplier;
        this.ball.vy = -14 * powerMultiplier;
        this.ball.vz = 16 * powerMultiplier;
        this.createFireworks(this.ball.x, this.ball.y);
      } else if (quality === 'GREAT') {
        runs = 4;
        this.fours++;
        window.soundEngine.playHit('four');
        this.triggerCameraEffect('FOUR');
        if (window.uiManager) window.uiManager.showCallout('FOUR!', 'GREAT SHOT • CRACKED TO BOUNDARY', 'four');

        this.ball.vx = (Math.random() * 6 - 3 + (direction === 'LEFT' ? -8 : direction === 'RIGHT' ? 8 : 0)) * powerMultiplier;
        this.ball.vy = -11 * powerMultiplier;
        this.ball.vz = 4;
      } else if (quality === 'GOOD') {
        runs = Math.random() > 0.5 ? 2 : 1;
        this.singles += runs;
        window.soundEngine.playHit('good');
        if (window.uiManager) window.uiManager.showCallout(`${runs} RUN`, 'GOOD CONTACT', 'single');

        this.ball.vx = (Math.random() * 8 - 4) * powerMultiplier;
        this.ball.vy = -6 * powerMultiplier;
        this.ball.vz = 2;
      } else {
        runs = 1;
        this.singles += runs;
        window.soundEngine.playHit('good');
        if (window.uiManager) window.uiManager.showCallout('1 RUN', 'OUTSIDE EDGE', 'single');

        this.ball.vx = (direction === 'RIGHT' ? -4 : 4) * powerMultiplier;
        this.ball.vy = -4 * powerMultiplier;
        this.ball.vz = 1;
      }

      const totalRuns = Math.round(runs * this.multiplier);
      this.score += totalRuns;
      if (window.shopManager) window.shopManager.addCoins(totalRuns * 2);

      setTimeout(() => this.nextDelivery(), 1600);
    } else {
      this.consecutiveHits = 0;
      if (window.uiManager) window.uiManager.showCallout('MISSED', 'SWUNG EARLY', 'single');
    }

    if (window.uiManager) window.uiManager.updateHUD();
  }

  triggerCameraEffect(type) {
    if (type === 'SIX') {
      this.cameraShake = 12;
    } else if (type === 'FOUR') {
      this.cameraShake = 6;
    } else if (type === 'WICKET') {
      this.cameraShake = 10;
    }
  }

  createFireworks(x, y) {
    const colors = ['#fbbf24', '#f97316', '#38bdf8', '#22c55e', '#ec4899'];
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03
      });
    }
  }

  endMatch() {
    this.state = 'GAME_OVER';
    if (this.timerInterval) clearInterval(this.timerInterval);

    const result = window.leaderboardManager ? window.leaderboardManager.submitMatchScore(this.score, this.sixes, this.fours) : { isNewHigh: false, highScore: this.score };
    if (window.uiManager) {
      window.uiManager.showGameOverScreen({
        runs: this.score,
        sixes: this.sixes,
        fours: this.fours,
        ballsFaced: this.ballsFaced,
        isNewHigh: result.isNewHigh
      });
    }
  }

  // Update Game Physics Loop
  update() {
    if (this.state !== 'PLAYING') return;

    if (this.cameraShake > 0) this.cameraShake *= 0.88;
    if (this.cameraShake < 0.2) this.cameraShake = 0;

    if (this.bowler && this.bowler.state === 'RUNNING') {
      this.bowler.runTimer += 0.05;
      this.bowler.y = 120 + Math.sin(this.bowler.runTimer * 10) * 4;

      if (this.bowler.runTimer > 1.2) {
        this.bowler.state = 'RELEASING';
        if (this.ball) {
          this.ball.state = 'IN_AIR';
          const dx = this.ball.targetX - this.ball.x;
          const dy = this.ball.targetY - this.ball.y;
          const dist = Math.hypot(dx, dy);
          this.ball.vx = (dx / dist) * (this.ball.speed * 0.3);
          this.ball.vy = this.ball.speed;
        }
      }
    }

    const batsmanY = this.batsman ? this.batsman.y : (this.height - 110);
    const stumpsX = this.stumps ? this.stumps.x : (this.width / 2);

    if (this.pendingShot && this.ball && (this.ball.state === 'IN_AIR' || this.ball.state === 'PITCHED')) {
      if (this.ball.y >= batsmanY - 140) {
        const shotDir = this.pendingShot;
        this.pendingShot = null;
        this.playShot(shotDir);
      }
    }

    if (this.ball && (this.ball.state === 'IN_AIR' || this.ball.state === 'PITCHED')) {
      this.ball.x += this.ball.vx;
      this.ball.y += this.ball.vy;

      if (this.ball.y >= this.ball.targetY && this.ball.state === 'IN_AIR') {
        this.ball.state = 'PITCHED';
        this.ball.z = 5;
        if (window.soundEngine) window.soundEngine.playBounce();

        if (this.ball.type === 'OUTSWING') this.ball.vx += 1.2;
        if (this.ball.type === 'INSWING') this.ball.vx -= 1.2;
      }

      if (this.ball.y > batsmanY + 40 && this.ball.state !== 'HIT' && this.ball.state !== 'OUT') {
        this.ball.state = 'OUT';
        if (!this.shotExecuted) {
          this.ballsFaced++;
          this.shotExecuted = true;
        }

        if (Math.abs(this.ball.x - stumpsX) < 22) {
          if (this.stumps) this.stumps.bailsOn = false;
          this.wickets++;
          if (window.soundEngine) window.soundEngine.playWicket();
          if (window.uiManager) window.uiManager.showCallout('BOWLED!', 'WICKET!', 'wicket');

          if (this.wickets >= this.maxWickets || (this.mode === 'SUPER_OVER' && this.ballsFaced >= 6)) {
            setTimeout(() => this.endMatch(), 1800);
          } else {
            setTimeout(() => this.nextDelivery(), 1800);
          }
        } else {
          if (window.uiManager) window.uiManager.showCallout('DOT BALL', 'NO RUN', 'single');

          if (this.mode === 'SUPER_OVER' && this.ballsFaced >= 6) {
            setTimeout(() => this.endMatch(), 1600);
          } else {
            setTimeout(() => this.nextDelivery(), 1600);
          }
        }
        if (window.uiManager) window.uiManager.updateHUD();
      }
    }

    if (this.ball && this.ball.state === 'HIT') {
      this.ball.x += this.ball.vx;
      this.ball.y += this.ball.vy;
      this.ball.z += this.ball.vz;
      this.ball.vz -= 0.6;
      if (this.ball.z < 0) this.ball.z = 0;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  // Canvas Render Loop
  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();

    if (this.cameraShake > 0) {
      const offsetX = (Math.random() * 2 - 1) * this.cameraShake;
      const offsetY = (Math.random() * 2 - 1) * this.cameraShake;
      this.ctx.translate(offsetX, offsetY);
    }

    this.drawStadium();
    this.drawPitch();
    this.drawTargetMarker();
    this.drawStumps();
    this.drawBowler();
    this.drawBatsman();
    this.drawBall();
    this.drawParticles();

    if (this.state === 'PLAYING' && this.ball && (this.ball.state === 'IN_AIR' || this.ball.state === 'PITCHED')) {
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.font = '900 18px Kanit, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⚡ HIT NOW! (SPACE / CLICK / SWIPE)', this.width / 2, this.height - 180);
    }

    this.ctx.restore();
  }

  drawStadium() {
    const stadium = (window.shopManager && typeof window.shopManager.getStadium === 'function') ? window.shopManager.getStadium() : { id: 'park' };
    
    if (stadium.id === 'cyber') {
      const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
      grad.addColorStop(0, '#050515');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#020617');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.width, this.height);

      this.ctx.strokeStyle = '#06b6d4';
      this.ctx.shadowColor = '#06b6d4';
      this.ctx.shadowBlur = 15;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.ellipse(this.width / 2, this.height * 0.45, this.width * 0.45, this.height * 0.38, 0, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    } else if (stadium.id === 'colosseum') {
      const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
      grad.addColorStop(0, '#451a03');
      grad.addColorStop(0.5, '#78350f');
      grad.addColorStop(1, '#292524');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.width, this.height);

      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.ellipse(this.width / 2, this.height * 0.45, this.width * 0.45, this.height * 0.38, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    } else if (stadium.id === 'oval') {
      const grad = this.ctx.createRadialGradient(this.width / 2, this.height / 2, 50, this.width / 2, this.height / 2, 400);
      grad.addColorStop(0, '#15803d');
      grad.addColorStop(0.7, '#166534');
      grad.addColorStop(1, '#052e16');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.width, this.height);

      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.ellipse(this.width / 2, this.height * 0.45, this.width * 0.45, this.height * 0.38, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    } else {
      const grad = this.ctx.createRadialGradient(this.width / 2, this.height / 2, 50, this.width / 2, this.height / 2, 400);
      grad.addColorStop(0, '#22c55e');
      grad.addColorStop(0.7, '#15803d');
      grad.addColorStop(1, '#14532d');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.width, this.height);

      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.ellipse(this.width / 2, this.height * 0.45, this.width * 0.45, this.height * 0.38, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  drawPitch() {
    this.ctx.fillStyle = '#d97706';
    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2 - 35, 120);
    this.ctx.lineTo(this.width / 2 + 35, 120);
    this.ctx.lineTo(this.width / 2 + 65, this.height - 80);
    this.ctx.lineTo(this.width / 2 - 65, this.height - 80);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2 - 38, 140);
    this.ctx.lineTo(this.width / 2 + 38, 140);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2 - 60, this.height - 110);
    this.ctx.lineTo(this.width / 2 + 60, this.height - 110);
    this.ctx.stroke();
  }

  drawTargetMarker() {
    if (!this.ball || this.ball.state === 'HIT' || this.ball.state === 'OUT' || this.ball.state === 'WAITING') return;

    const helm = (window.shopManager && typeof window.shopManager.getHelmet === 'function') ? window.shopManager.getHelmet() : { id: 'blue_helm' };
    const showHUD = helm.id === 'cyber_helm';

    this.ctx.strokeStyle = this.ball.type === 'SLOW' ? '#38bdf8' : '#ef4444';
    this.ctx.lineWidth = showHUD ? 3 : 2;
    this.ctx.beginPath();
    this.ctx.arc(this.ball.targetX, this.ball.targetY, showHUD ? 16 : 12, 0, Math.PI * 2);
    this.ctx.stroke();

    if (showHUD) {
      this.ctx.setLineDash([4, 4]);
      this.ctx.strokeStyle = '#06b6d4';
      this.ctx.beginPath();
      this.ctx.moveTo(this.width / 2, 130);
      this.ctx.lineTo(this.ball.targetX, this.ball.targetY);
      this.ctx.lineTo(this.width / 2, this.height - 110);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  drawStumps() {
    const sx = (this.stumps && typeof this.stumps.x === 'number') ? this.stumps.x : (this.width / 2);
    const sy = (this.stumps && typeof this.stumps.y === 'number') ? this.stumps.y : (this.height - 90);
    const bailsOn = this.stumps ? this.stumps.bailsOn : true;

    this.ctx.fillStyle = '#fbbf24';
    for (let i = -1; i <= 1; i++) {
      this.ctx.fillRect(sx + i * 8 - 2, sy - 25, 4, 25);
    }

    if (bailsOn) {
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fillRect(sx - 11, sy - 27, 22, 3);
    }
  }

  drawBowler() {
    const bx = (this.bowler && typeof this.bowler.x === 'number') ? this.bowler.x : (this.width / 2);
    const by = (this.bowler && typeof this.bowler.y === 'number') ? this.bowler.y : 120;

    this.ctx.fillStyle = '#38bdf8';
    this.ctx.beginPath();
    this.ctx.arc(bx, by - 16, 7, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(bx - 6, by - 9, 12, 16);
  }

  drawBatsman() {
    const bx = (this.batsman && typeof this.batsman.x === 'number') ? this.batsman.x : (this.width / 2);
    const by = (this.batsman && typeof this.batsman.y === 'number') ? this.batsman.y : (this.height - 110);
    const animState = this.batsman ? this.batsman.animState : 'READY';

    const bat = (window.shopManager && typeof window.shopManager.getBat === 'function') ? window.shopManager.getBat() : { id: 'classic', powerBoost: 1.0, trail: 'none' };
    const helm = (window.shopManager && typeof window.shopManager.getHelmet === 'function') ? window.shopManager.getHelmet() : { id: 'blue_helm' };

    this.ctx.save();
    this.ctx.translate(bx, by);

    this.ctx.fillStyle = helm.id === 'golden_helm' ? '#fbbf24' : helm.id === 'cyber_helm' ? '#06b6d4' : '#2563eb';
    this.ctx.beginPath();
    this.ctx.arc(0, -32, 11, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(-6, -32, 12, 4);

    this.ctx.fillStyle = '#dc2626';
    this.ctx.fillRect(-12, -20, 24, 26);

    this.ctx.fillStyle = '#f8fafc';
    this.ctx.fillRect(-10, 6, 8, 20);
    this.ctx.fillRect(2, 6, 8, 20);

    this.ctx.save();
    if (animState === 'SWINGING') {
      if (this.batsman) this.batsman.swingProgress = Math.min(1.0, (this.batsman.swingProgress || 0) + 0.15);
      const prog = this.batsman ? this.batsman.swingProgress : 0.5;
      const angle = -Math.PI / 4 + (prog * Math.PI * 0.8);
      this.ctx.rotate(angle);
    } else {
      this.ctx.rotate(-0.3);
    }

    this.ctx.fillStyle = bat.id === 'golden' ? '#fbbf24' : bat.id === 'flame' ? '#ea580c' : bat.id === 'thunderbolt' ? '#0284c7' : '#d97706';
    this.ctx.fillRect(8, -18, 6, 32);

    if (bat.trail === 'lightning') {
      this.ctx.strokeStyle = '#38bdf8';
      this.ctx.shadowColor = '#38bdf8';
      this.ctx.shadowBlur = 10;
      this.ctx.strokeRect(6, -20, 10, 36);
      this.ctx.shadowBlur = 0;
    } else if (bat.trail === 'fire') {
      this.ctx.strokeStyle = '#ef4444';
      this.ctx.shadowColor = '#f97316';
      this.ctx.shadowBlur = 12;
      this.ctx.strokeRect(6, -20, 10, 36);
      this.ctx.shadowBlur = 0;
    }

    this.ctx.restore();
    this.ctx.restore();
  }

  drawBall() {
    if (!this.ball || this.ball.state === 'WAITING') return;

    const bx = typeof this.ball.x === 'number' ? this.ball.x : (this.width / 2);
    const by = typeof this.ball.y === 'number' ? this.ball.y : 200;
    const bz = typeof this.ball.z === 'number' ? this.ball.z : 0;

    const scale = 1.0 + (bz / 40);
    const radius = 6 * scale;

    this.ctx.save();
    this.ctx.fillStyle = '#dc2626';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    this.ctx.shadowOffsetY = bz;
    this.ctx.shadowBlur = 6;

    this.ctx.beginPath();
    this.ctx.arc(bx, by - bz, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(bx, by - bz, radius * 0.7, 0, Math.PI);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawParticles() {
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;
  }
}

window.CricketGame = CricketGame;
