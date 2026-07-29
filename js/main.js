/**
 * Main Application Bootstrapper for Cricket Smash
 */

document.addEventListener('DOMContentLoaded', () => {
  window.game = new CricketGame('game-canvas');

  // Trigger resize to fit layout correctly
  setTimeout(() => {
    if (window.game) window.game.resizeCanvas();
  }, 100);

  window.addEventListener('resize', () => {
    if (window.game) window.game.resizeCanvas();
  });

  function gameLoop() {
    if (window.game) {
      window.game.update();
      window.game.render();
    }
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

  const unlockAudio = () => {
    if (window.soundEngine) window.soundEngine.init();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('click', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('click', unlockAudio, { passive: true });
});
