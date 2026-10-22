import { Missile, Bullet, Explosion, GameState, Upgrades } from './types';

let nextId = 0;
const getId = () => ++nextId;

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const GROUND_HEIGHT = 80;
export const BASE_X = CANVAS_WIDTH / 2;
export const BASE_Y = CANVAS_HEIGHT - GROUND_HEIGHT;

export function createInitialState(): GameState {
  return {
    score: 0,
    money: 100,
    wave: 0,
    hp: 100,
    maxHp: 100,
    missiles: [],
    bullets: [],
    explosions: [],
    upgrades: {
      firepower: 0,
      fireRate: 0,
      bulletCount: 0,
      bulletSpeed: 0,
      fortification: 0,
      maxHp: 0,
      radar: 0,
    },
    gameOver: false,
    waveActive: false,
    waveTimer: 0,
    missilesDestroyed: 0,
    isPaused: false,
  };
}

export function getDamage(upgrades: Upgrades): number {
  return 10 + upgrades.firepower * 8;
}

export function getFireRate(upgrades: Upgrades): number {
  return Math.max(100, 500 - upgrades.fireRate * 50);
}

export function getBulletCount(upgrades: Upgrades): number {
  return 1 + upgrades.bulletCount;
}

export function getBulletSpeed(upgrades: Upgrades): number {
  return 8 + upgrades.bulletSpeed * 2;
}

export function getDamageReduction(upgrades: Upgrades): number {
  return Math.min(0.8, upgrades.fortification * 0.1);
}

export function getMaxHp(upgrades: Upgrades): number {
  return 100 + upgrades.maxHp * 50;
}

export function getRadarRange(upgrades: Upgrades): number {
  return 100 + upgrades.radar * 30;
}

export function createBullet(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  upgrades: Upgrades,
  spreadIndex: number = 0,
  totalBullets: number = 1
): Bullet {
  const speed = getBulletSpeed(upgrades);
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const spreadAngle = (spreadIndex - (totalBullets - 1) / 2) * 0.15;
  const finalAngle = angle + spreadAngle;

  return {
    id: getId(),
    x: fromX,
    y: fromY,
    vx: Math.cos(finalAngle) * speed,
    vy: Math.sin(finalAngle) * speed,
    damage: getDamage(upgrades),
    size: 4 + upgrades.firepower,
  };
}

export function createMissile(wave: number): Missile {
  const types: Missile['type'][] = ['basic', 'fast', 'heavy', 'cluster'];
  let type: Missile['type'] = 'basic';

  const roll = Math.random();
  if (wave >= 8 && roll < 0.15) type = 'cluster';
  else if (wave >= 5 && roll < 0.3) type = 'heavy';
  else if (wave >= 3 && roll < 0.5) type = 'fast';

  const configs = {
    basic: { speed: 1.5 + wave * 0.1, hp: 20, width: 12, height: 24 },
    fast: { speed: 2.5 + wave * 0.15, hp: 15, width: 8, height: 20 },
    heavy: { speed: 1 + wave * 0.05, hp: 60, width: 16, height: 32 },
    cluster: { speed: 1.8 + wave * 0.08, hp: 30, width: 14, height: 28 },
  };

  const config = configs[type];
  const startX = Math.random() * (CANVAS_WIDTH - 100) + 50;
  const targetX = BASE_X + (Math.random() - 0.5) * 200;

  const angle = Math.atan2(BASE_Y - 0, targetX - startX);

  return {
    id: getId(),
    x: startX,
    y: -30,
    speed: config.speed,
    angle: angle,
    hp: config.hp + wave * 5,
    maxHp: config.hp + wave * 5,
    type,
    width: config.width,
    height: config.height,
  };
}

export function createExplosion(x: number, y: number): Explosion {
  return {
    id: getId(),
    x,
    y,
    frame: 0,
    maxFrames: 12,
  };
}

export function updateBullets(bullets: Bullet[]): Bullet[] {
  return bullets.filter((b) => {
    b.x += b.vx;
    b.y += b.vy;
    return b.x > -10 && b.x < CANVAS_WIDTH + 10 && b.y > -10 && b.y < CANVAS_HEIGHT + 10;
  });
}

export function updateMissiles(missiles: Missile[]): Missile[] {
  return missiles.filter((m) => {
    m.x += Math.cos(m.angle) * m.speed;
    m.y += Math.sin(m.angle) * m.speed;

    // Recalculate angle towards base
    const dx = BASE_X - m.x;
    const dy = BASE_Y - m.y;
    m.angle = Math.atan2(dy, dx);

    return m.y < BASE_Y + 20;
  });
}

export function updateExplosions(explosions: Explosion[]): Explosion[] {
  return explosions
    .map((e) => ({ ...e, frame: e.frame + 1 }))
    .filter((e) => e.frame < e.maxFrames);
}

export function checkCollisions(
  bullets: Bullet[],
  missiles: Missile[],
  upgrades: Upgrades
): { bullets: Bullet[]; missiles: Missile[]; explosions: Explosion[]; money: number; score: number } {
  const newExplosions: Explosion[] = [];
  let money = 0;
  let score = 0;
  const bulletsToRemove = new Set<number>();
  const missilesToRemove = new Set<number>();

  for (const bullet of bullets) {
    for (const missile of missiles) {
      if (missilesToRemove.has(missile.id)) continue;

      const dx = bullet.x - missile.x;
      const dy = bullet.y - missile.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < (missile.width + bullet.size) / 2 + 5) {
        bulletsToRemove.add(bullet.id);
        missile.hp -= bullet.damage;

        if (missile.hp <= 0) {
          missilesToRemove.add(missile.id);
          newExplosions.push(createExplosion(missile.x, missile.y));

          const reward = { basic: 10, fast: 15, heavy: 25, cluster: 20 }[missile.type];
          money += reward;
          score += reward * 2;
        } else {
          newExplosions.push(createExplosion(bullet.x, bullet.y));
        }
        break;
      }
    }
  }

  return {
    bullets: bullets.filter((b) => !bulletsToRemove.has(b.id)),
    missiles: missiles.filter((m) => !missilesToRemove.has(m.id)),
    explosions: newExplosions,
    money,
    score,
  };
}

export function checkBaseHits(
  missiles: Missile[],
  upgrades: Upgrades
): { missiles: Missile[]; damage: number; explosions: Explosion[] } {
  const newExplosions: Explosion[] = [];
  const missilesToRemove = new Set<number>();
  let damage = 0;
  const reduction = getDamageReduction(upgrades);

  for (const missile of missiles) {
    if (missile.y >= BASE_Y - 10) {
      missilesToRemove.add(missile.id);
      newExplosions.push(createExplosion(missile.x, BASE_Y));

      const baseDamage = { basic: 15, fast: 10, heavy: 30, cluster: 20 }[missile.type];
      damage += baseDamage * (1 - reduction);
    }
  }

  return {
    missiles: missiles.filter((m) => !missilesToRemove.has(m.id)),
    damage,
    explosions: newExplosions,
  };
}

// Pixel art drawing functions
export function drawPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

export function drawBase(ctx: CanvasRenderingContext2D, hp: number, maxHp: number, fortLevel: number) {
  const bx = BASE_X;
  const by = BASE_Y;

  // Base structure
  const baseColor = fortLevel > 3 ? '#4a6741' : fortLevel > 1 ? '#5a7751' : '#6a8761';
  const wallColor = fortLevel > 3 ? '#3a5731' : fortLevel > 1 ? '#4a6741' : '#5a7751';

  // Main building
  drawPixelRect(ctx, bx - 30, by - 40, 60, 40, baseColor);
  drawPixelRect(ctx, bx - 26, by - 36, 52, 32, '#2a3721');

  // Cannon turret
  drawPixelRect(ctx, bx - 8, by - 55, 16, 20, '#555');
  drawPixelRect(ctx, bx - 4, by - 65, 8, 15, '#777');
  drawPixelRect(ctx, bx - 2, by - 70, 4, 8, '#999');

  // Fortification walls
  if (fortLevel > 0) {
    const wallHeight = 10 + fortLevel * 5;
    drawPixelRect(ctx, bx - 50, by - wallHeight, 15, wallHeight, wallColor);
    drawPixelRect(ctx, bx + 35, by - wallHeight, 15, wallHeight, wallColor);

    // Battlements
    for (let i = 0; i < 3; i++) {
      drawPixelRect(ctx, bx - 50 + i * 6, by - wallHeight - 6, 4, 6, wallColor);
      drawPixelRect(ctx, bx + 35 + i * 6, by - wallHeight - 6, 4, 6, wallColor);
    }
  }

  // HP bar
  const hpPercent = hp / maxHp;
  const barWidth = 60;
  drawPixelRect(ctx, bx - barWidth / 2, by + 5, barWidth, 6, '#333');
  drawPixelRect(ctx, bx - barWidth / 2, by + 5, barWidth * hpPercent, 6, hpPercent > 0.5 ? '#4a4' : hpPercent > 0.25 ? '#aa4' : '#a44');

  // Pixel details
  drawPixelRect(ctx, bx - 20, by - 30, 8, 8, '#445');
  drawPixelRect(ctx, bx + 12, by - 30, 8, 8, '#445');
  drawPixelRect(ctx, bx - 4, by - 25, 8, 12, '#332');
}

export function drawMissile(ctx: CanvasRenderingContext2D, missile: Missile) {
  const { x, y, width, height, type } = missile;
  const colors = {
    basic: { body: '#c33', tip: '#f55', fin: '#922' },
    fast: { body: '#3c3', tip: '#5f5', fin: '#292' },
    heavy: { body: '#33c', tip: '#55f', fin: '#229' },
    cluster: { body: '#c3c', tip: '#f5f', fin: '#929' },
  };

  const color = colors[type];
  const angle = missile.angle;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);

  // Body
  drawPixelRect(ctx, -width / 2, -height / 2, width, height * 0.7, color.body);
  // Tip
  drawPixelRect(ctx, -width / 4, -height / 2 - 6, width / 2, 8, color.tip);
  // Fins
  drawPixelRect(ctx, -width / 2 - 4, height / 2 - 8, 4, 10, color.fin);
  drawPixelRect(ctx, width / 2, height / 2 - 8, 4, 10, color.fin);
  // Flame
  const flameSize = 4 + Math.random() * 4;
  drawPixelRect(ctx, -3, height / 2, 6, flameSize, '#fa0');
  drawPixelRect(ctx, -2, height / 2 + flameSize, 4, flameSize * 0.6, '#f50');

  ctx.restore();

  // HP bar for heavy missiles
  if (type === 'heavy' || type === 'cluster') {
    const hpPercent = missile.hp / missile.maxHp;
    drawPixelRect(ctx, x - 12, y - height / 2 - 8, 24, 3, '#333');
    drawPixelRect(ctx, x - 12, y - height / 2 - 8, 24 * hpPercent, 3, '#f44');
  }
}

export function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet) {
  drawPixelRect(ctx, bullet.x - bullet.size / 2, bullet.y - bullet.size / 2, bullet.size, bullet.size, '#ff0');
  drawPixelRect(ctx, bullet.x - bullet.size / 4, bullet.y - bullet.size / 4, bullet.size / 2, bullet.size / 2, '#fff');
}

export function drawExplosion(ctx: CanvasRenderingContext2D, explosion: Explosion) {
  const progress = explosion.frame / explosion.maxFrames;
  const radius = 10 + progress * 25;
  const alpha = 1 - progress;

  const colors = ['#ff0', '#fa0', '#f50', '#f00', '#800'];
  const colorIdx = Math.min(Math.floor(progress * colors.length), colors.length - 1);

  ctx.globalAlpha = alpha;

  // Pixel explosion pattern
  const pixelSize = 4;
  const gridSize = Math.ceil(radius / pixelSize);

  for (let gx = -gridSize; gx <= gridSize; gx++) {
    for (let gy = -gridSize; gy <= gridSize; gy++) {
      const dist = Math.sqrt(gx * gx + gy * gy);
      if (dist <= gridSize * (1 - progress * 0.3)) {
        const noise = Math.random();
        if (noise > progress) {
          const c = colors[Math.min(colorIdx + (noise > 0.7 ? 1 : 0), colors.length - 1)];
          drawPixelRect(
            ctx,
            explosion.x + gx * pixelSize - pixelSize / 2,
            explosion.y + gy * pixelSize - pixelSize / 2,
            pixelSize,
            pixelSize,
            c
          );
        }
      }
    }
  }

  ctx.globalAlpha = 1;
}

export function drawGround(ctx: CanvasRenderingContext2D) {
  // Ground
  drawPixelRect(ctx, 0, BASE_Y, CANVAS_WIDTH, GROUND_HEIGHT, '#3a5a2a');
  drawPixelRect(ctx, 0, BASE_Y, CANVAS_WIDTH, 4, '#4a6a3a');

  // Pixel grass details
  for (let i = 0; i < CANVAS_WIDTH; i += 8) {
    if (Math.random() > 0.5) {
      drawPixelRect(ctx, i, BASE_Y - 2, 4, 4, '#5a7a4a');
    }
  }

  // Dirt
  drawPixelRect(ctx, 0, BASE_Y + 20, CANVAS_WIDTH, GROUND_HEIGHT - 20, '#5a4a2a');
  for (let i = 0; i < CANVAS_WIDTH; i += 16) {
    if (Math.random() > 0.6) {
      drawPixelRect(ctx, i, BASE_Y + 30 + Math.random() * 20, 6, 4, '#4a3a1a');
    }
  }
}

export function drawStars(ctx: CanvasRenderingContext2D, frame: number) {
  ctx.fillStyle = '#0a0a2a';
  ctx.fillRect(0, 0, CANVAS_WIDTH, BASE_Y);

  // Stars
  const starSeed = 42;
  for (let i = 0; i < 60; i++) {
    const sx = ((starSeed * (i + 1) * 7) % CANVAS_WIDTH);
    const sy = ((starSeed * (i + 1) * 13) % (BASE_Y - 50));
    const twinkle = Math.sin(frame * 0.05 + i) > 0.3;
    if (twinkle) {
      drawPixelRect(ctx, sx, sy, 2, 2, '#fff');
    } else {
      drawPixelRect(ctx, sx, sy, 2, 2, '#888');
    }
  }
}

export function drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = '#0f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x - 4, y);
  ctx.moveTo(x + 4, y);
  ctx.lineTo(x + 10, y);
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x, y - 4);
  ctx.moveTo(x, y + 4);
  ctx.lineTo(x, y + 10);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.stroke();
}
