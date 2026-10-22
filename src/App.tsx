import { useEffect, useRef, useState, useCallback } from 'react';
import {
  GameState,
  Upgrades,
  UPGRADE_COSTS,
  UPGRADE_NAMES,
  UPGRADE_DESCRIPTIONS,
} from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BASE_X,
  BASE_Y,
  createInitialState,
  createMissile,
  createBullet,
  updateBullets,
  updateMissiles,
  updateExplosions,
  checkCollisions,
  checkBaseHits,
  drawBase,
  drawMissile,
  drawBullet,
  drawExplosion,
  drawGround,
  drawStars,
  drawCrosshair,
  getBulletCount,
  getMaxHp,
  getFireRate,
} from './gameEngine';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const mouseRef = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
  const lastShotRef = useRef(0);
  const frameRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const waveSpawnTimerRef = useRef(0);
  const missilesToSpawnRef = useRef(0);

  const [uiState, setUiState] = useState({
    score: 0,
    money: 100,
    wave: 0,
    hp: 100,
    maxHp: 100,
    gameOver: false,
    waveActive: false,
    missilesDestroyed: 0,
    showShop: false,
  });

  const [upgrades, setUpgrades] = useState<Upgrades>({
    firepower: 0,
    fireRate: 0,
    bulletCount: 0,
    bulletSpeed: 0,
    fortification: 0,
    maxHp: 0,
    radar: 0,
  });

  const [showShop, setShowShop] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const syncUI = useCallback(() => {
    const gs = gameStateRef.current;
    setUiState({
      score: gs.score,
      money: gs.money,
      wave: gs.wave,
      hp: gs.hp,
      maxHp: gs.maxHp,
      gameOver: gs.gameOver,
      waveActive: gs.waveActive,
      missilesDestroyed: gs.missilesDestroyed,
      showShop: gs.isPaused,
    });
    setUpgrades({ ...gs.upgrades });
  }, []);

  const startWave = useCallback(() => {
    const gs = gameStateRef.current;
    gs.wave++;
    gs.waveActive = true;
    gs.isPaused = false;
    missilesToSpawnRef.current = 5 + gs.wave * 3;
    waveSpawnTimerRef.current = 0;
    syncUI();
  }, [syncUI]);

  const startGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    setGameStarted(true);
    setShowShop(false);
    syncUI();
  }, [syncUI]);

  const buyUpgrade = useCallback((key: keyof Upgrades) => {
    const gs = gameStateRef.current;
    const level = gs.upgrades[key];
    const costs = UPGRADE_COSTS[key];

    if (level >= costs.length) return;
    const cost = costs[level];

    if (gs.money >= cost) {
      gs.money -= cost;
      gs.upgrades[key]++;

      if (key === 'maxHp') {
        gs.maxHp = getMaxHp(gs.upgrades);
        gs.hp = gs.maxHp;
      }

      syncUI();
    }
  }, [syncUI]);

  // Game loop
  useEffect(() => {
    if (!gameStarted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const gs = gameStateRef.current;
      frameRef.current++;

      if (!gs.gameOver && !gs.isPaused) {
        // Spawn missiles
        if (gs.waveActive && missilesToSpawnRef.current > 0) {
          waveSpawnTimerRef.current++;
          const spawnRate = Math.max(20, 60 - gs.wave * 3);
          if (waveSpawnTimerRef.current >= spawnRate) {
            waveSpawnTimerRef.current = 0;
            gs.missiles.push(createMissile(gs.wave));
            missilesToSpawnRef.current--;
          }
        }

        // Check wave completion
        if (gs.waveActive && missilesToSpawnRef.current <= 0 && gs.missiles.length === 0) {
          gs.waveActive = false;
          gs.isPaused = true;
          gs.money += 20 + gs.wave * 10;
          syncUI();
        }

        // Auto-fire
        const now = Date.now();
        const fireRate = getFireRate(gs.upgrades);
        if (now - lastShotRef.current >= fireRate && gs.waveActive) {
          lastShotRef.current = now;
          const bulletCount = getBulletCount(gs.upgrades);
          for (let i = 0; i < bulletCount; i++) {
            gs.bullets.push(
              createBullet(
                BASE_X,
                BASE_Y - 65,
                mouseRef.current.x,
                mouseRef.current.y,
                gs.upgrades,
                i,
                bulletCount
              )
            );
          }
        }

        // Update
        gs.bullets = updateBullets(gs.bullets);
        gs.missiles = updateMissiles(gs.missiles);
        gs.explosions = updateExplosions(gs.explosions);

        // Collisions
        const collisionResult = checkCollisions(gs.bullets, gs.missiles, gs.upgrades);
        gs.bullets = collisionResult.bullets;
        gs.missiles = collisionResult.missiles;
        gs.explosions = [...gs.explosions, ...collisionResult.explosions];
        gs.money += collisionResult.money;
        gs.score += collisionResult.score;
        gs.missilesDestroyed += collisionResult.explosions.length;

        // Base hits
        const baseHitResult = checkBaseHits(gs.missiles, gs.upgrades);
        gs.missiles = baseHitResult.missiles;
        gs.explosions = [...gs.explosions, ...baseHitResult.explosions];
        gs.hp -= baseHitResult.damage;

        if (gs.hp <= 0) {
          gs.hp = 0;
          gs.gameOver = true;
        }
      }

      // Render
      ctx.imageSmoothingEnabled = false;

      // Background
      drawStars(ctx, frameRef.current);

      // Ground
      drawGround(ctx);

      // Base
      drawBase(ctx, gs.hp, gs.maxHp, gs.upgrades.fortification);

      // Missiles
      for (const missile of gs.missiles) {
        drawMissile(ctx, missile);
      }

      // Bullets
      for (const bullet of gs.bullets) {
        drawBullet(ctx, bullet);
      }

      // Explosions
      for (const explosion of gs.explosions) {
        drawExplosion(ctx, explosion);
      }

      // Crosshair
      if (!gs.gameOver && !gs.isPaused) {
        drawCrosshair(ctx, mouseRef.current.x, mouseRef.current.y);
      }

      // Sync UI periodically
      if (frameRef.current % 10 === 0) {
        syncUI();
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameStarted, syncUI]);

  // Mouse handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      mouseRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    return () => canvas.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-green-400 mb-4 pixel-font">
            🚀 ПВО ЗАЩИТНИК 🛡️
          </h1>
          <p className="text-gray-300 text-lg mb-2">Пиксельная игра по защите базы</p>
          <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
            Сбивайте вражеские ракеты, зарабатывайте деньги и улучшайте свою систему ПВО!
            Укрепляйте базу и отразите все волны атак!
          </p>
          <div className="space-y-3 mb-8 text-left max-w-sm mx-auto">
            <div className="text-gray-300 flex items-center gap-2">
              <span className="text-yellow-400">🎯</span> Двигайте мышью для прицеливания
            </div>
            <div className="text-gray-300 flex items-center gap-2">
              <span className="text-yellow-400">💥</span> Автоматическая стрельба
            </div>
            <div className="text-gray-300 flex items-center gap-2">
              <span className="text-yellow-400">💰</span> Покупайте улучшения между волнами
            </div>
            <div className="text-gray-300 flex items-center gap-2">
              <span className="text-yellow-400">🏰</span> Стройте укрепления для защиты
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white text-xl font-bold rounded-lg transition-colors shadow-lg shadow-green-900/50"
          >
            ▶ НАЧАТЬ ИГРУ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center p-2 md:p-4">
      {/* HUD */}
      <div className="w-full max-w-[800px] mb-2">
        <div className="flex flex-wrap justify-between items-center bg-gray-800 rounded-lg p-2 md:p-3 gap-2">
          <div className="flex gap-3 md:gap-4 text-sm md:text-base">
            <span className="text-yellow-400">💰 {uiState.money}</span>
            <span className="text-green-400">🏆 {uiState.score}</span>
            <span className="text-blue-400">🌊 Волна: {uiState.wave}</span>
          </div>
          <div className="flex gap-3 md:gap-4 text-sm md:text-base">
            <span className="text-red-400">❤️ {Math.ceil(uiState.hp)}/{uiState.maxHp}</span>
            <span className="text-purple-400">💀 {uiState.missilesDestroyed}</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full max-w-[800px]">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full border-2 border-gray-700 rounded-lg cursor-none"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Shop overlay */}
        {showShop && !uiState.gameOver && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg p-4">
            <div className="bg-gray-800 rounded-xl p-4 md:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-yellow-400 mb-2 text-center">
                🛒 МАГАЗИН УЛУЧШЕНИЙ
              </h2>
              <p className="text-gray-400 text-center mb-4">
                Волна {uiState.wave} пройдена! 💰 {uiState.money} монет
              </p>

              <div className="space-y-2 mb-4">
                {(Object.keys(UPGRADE_COSTS) as (keyof Upgrades)[]).map((key) => {
                  const level = upgrades[key];
                  const costs = UPGRADE_COSTS[key];
                  const isMaxed = level >= costs.length;
                  const cost = isMaxed ? 0 : costs[level];
                  const canAfford = uiState.money >= cost;

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between bg-gray-700 rounded-lg p-2 md:p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-semibold truncate">
                          {UPGRADE_NAMES[key]}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {UPGRADE_DESCRIPTIONS[key]}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {costs.map((_, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded-sm ${
                                i < level ? 'bg-green-500' : 'bg-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => buyUpgrade(key)}
                        disabled={isMaxed || !canAfford}
                        className={`ml-2 px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap ${
                          isMaxed
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : canAfford
                            ? 'bg-green-600 hover:bg-green-500 text-white'
                            : 'bg-red-900 text-red-400 cursor-not-allowed'
                        }`}
                      >
                        {isMaxed ? 'MAX' : `💰${cost}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={startWave}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-lg font-bold rounded-lg transition-colors"
              >
                🚀 СЛЕДУЮЩАЯ ВОЛНА ({uiState.wave + 1})
              </button>
            </div>
          </div>
        )}

        {/* Game Over overlay */}
        {uiState.gameOver && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
            <div className="text-center p-6">
              <h2 className="text-4xl font-bold text-red-500 mb-4">💥 БАЗА УНИЧТОЖЕНА 💥</h2>
              <p className="text-gray-300 text-lg mb-2">Волна: {uiState.wave}</p>
              <p className="text-yellow-400 text-lg mb-2">Очки: {uiState.score}</p>
              <p className="text-purple-400 text-lg mb-6">Ракет сбито: {uiState.missilesDestroyed}</p>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white text-xl font-bold rounded-lg transition-colors"
              >
                🔄 ИГРАТЬ СНОВА
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls info */}
      <div className="w-full max-w-[800px] mt-2 text-center text-gray-500 text-xs">
        Двигайте мышью для прицеливания • Стрельба автоматическая • Между волнами - магазин улучшений
      </div>
    </div>
  );
}

export default App;
