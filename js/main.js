/**
 * Main Application Bootstrapper for Cricket Smash
 * Initializes managers, game engine loop, and touch interaction hooks.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Instantiate Game Engine
  window.game = new CricketGame('game-canvas');

  // Main 60 FPS Animation Loop
  function gameLoop() {
    if (window.game) {
      window.game.update();
      window.game.render();
    }
    requestAnimationFrame(gameLoop);
  }

  // Start Loop
  requestAnimationFrame(gameLoop);

  // Initialize sound on first user touch / click
  const unlockAudio = () => {
    if (window.soundEngine) window.soundEngine.init();
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('click', unlockAudio);
  };
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('click', unlockAudio, { passive: true });

  console.log('⚡ Cricket Smash Bootstrapped Successfully!');
});
