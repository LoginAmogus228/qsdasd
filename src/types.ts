export interface Missile {
  id: number;
  x: number;
  y: number;
  speed: number;
  angle: number;
  hp: number;
  maxHp: number;
  type: 'basic' | 'fast' | 'heavy' | 'cluster';
  width: number;
  height: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  size: number;
}

export interface Explosion {
  id: number;
  x: number;
  y: number;
  frame: number;
  maxFrames: number;
}

export interface Upgrades {
  firepower: number;      // Урон снарядов
  fireRate: number;       // Скорость стрельбы
  bulletCount: number;    // Кол-во снарядов за выстрел
  bulletSpeed: number;    // Скорость снарядов
  fortification: number;  // Прочность укреплений
  maxHp: number;          // Макс. здоровье базы
  radar: number;          // Дальность обнаружения
}

export interface GameState {
  score: number;
  money: number;
  wave: number;
  hp: number;
  maxHp: number;
  missiles: Missile[];
  bullets: Bullet[];
  explosions: Explosion[];
  upgrades: Upgrades;
  gameOver: boolean;
  waveActive: boolean;
  waveTimer: number;
  missilesDestroyed: number;
  isPaused: boolean;
}

export const UPGRADE_COSTS: Record<keyof Upgrades, number[]> = {
  firepower: [50, 100, 200, 400, 800, 1500, 3000, 5000],
  fireRate: [50, 100, 200, 400, 800, 1500, 3000, 5000],
  bulletCount: [100, 250, 500, 1000, 2000, 4000, 8000, 15000],
  bulletSpeed: [30, 60, 120, 240, 480, 960, 1920, 3840],
  fortification: [75, 150, 300, 600, 1200, 2400, 4800, 9600],
  maxHp: [100, 200, 400, 800, 1600, 3200, 6400, 12800],
  radar: [40, 80, 160, 320, 640, 1280, 2560, 5120],
};

export const UPGRADE_NAMES: Record<keyof Upgrades, string> = {
  firepower: 'Огневая мощь',
  fireRate: 'Скорострельность',
  bulletCount: 'Кол-во снарядов',
  bulletSpeed: 'Скорость снарядов',
  fortification: 'Укрепления',
  maxHp: 'Прочность базы',
  radar: 'Радар',
};

export const UPGRADE_DESCRIPTIONS: Record<keyof Upgrades, string> = {
  firepower: 'Увеличивает урон снарядов',
  fireRate: 'Уменьшает задержку между выстрелами',
  bulletCount: 'Добавляет снаряды за выстрел',
  bulletSpeed: 'Увеличивает скорость полёта снарядов',
  fortification: 'Снижает урон по базе',
  maxHp: 'Увеличивает макс. здоровье базы',
  radar: 'Увеличивает дальность обнаружения',
};
