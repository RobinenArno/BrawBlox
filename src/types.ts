/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export type EntityType = 'PLAYER' | 'BOT' | 'PROJECTILE' | 'POWERUP' | 'FOOTBALL';
export type Team = 'RED' | 'BLUE' | 'NONE';

export interface Entity {
  id: string;
  type: EntityType;
  pos: Point;
  vel: Point;
  radius: number;
  color: string;
}

export interface Ball extends Entity {
  lastKickerId?: string;
  friction: number;
}

export interface PowerUp extends Entity {
  value: number;
}

export interface Brawler extends Entity {
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  lastAttackTime: number;
  name: string;
  score: number;
  angle: number; // In radians
  powerLevel: number;
  team: Team;
  clubId?: string;
  image: string;
  range: number;
  baseRadius: number;
  isInBush?: boolean;
}

export interface Club {
  id: string;
  name: string;
  icon: string;
  description: string;
  memberCount: number;
  trophies: number;
  messages: ClubMessage[];
}

export interface ClubMessage {
  id: string;
  senderName: string;
  senderImage: string;
  text: string;
  timestamp: number;
}

export interface Projectile extends Entity {
  ownerId: string;
  damage: number;
  distanceTraveled: number;
  maxDistance: number;
  team: Team;
}

export interface MapConfig {
  id: string;
  name: string;
  color: string;
  gridColor: string;
  obstacles: { x: number; y: number; w: number; h: number }[];
  bushes: { x: number; y: number; w: number; h: number }[];
  jumpPads?: { x: number; y: number; radius: number; force: number; angle: number }[];
  worldSize: { width: number; height: number };
  image: string;
  isFootball?: boolean;
  goals?: { team: Team; x: number; y: number; w: number; h: number }[];
}

export interface GameState {
  players: Record<string, Brawler>;
  projectiles: Projectile[];
  powerups: PowerUp[];
  ball?: Ball;
  map: MapConfig;
  teamScores: Record<Team, number>;
  winnerTeam?: Team;
  playerWon?: boolean;
  playerLost?: boolean;
  loseReason?: 'SHRUNK' | 'DIED';
}

export const KILLS_TO_WIN = 15;
export const START_POWER_LEVEL = 5;

export const MAPS: Record<string, MapConfig> = {
  ARENA: {
    id: 'arena',
    name: 'Klassieke Arena',
    color: '#1e293b', // slate-800
    gridColor: '#334155',
    worldSize: { width: 2000, height: 2000 },
    image: 'https://picsum.photos/seed/arena-game/800/600',
    obstacles: [
      { x: 400, y: 400, w: 200, h: 200 },
      { x: 1400, y: 400, w: 200, h: 200 },
      { x: 400, y: 1400, w: 200, h: 200 },
      { x: 1400, y: 1400, w: 200, h: 200 },
      { x: 200, y: 900, w: 200, h: 200 }, // Moved from center
      { x: 1600, y: 900, w: 200, h: 200 },
    ],
    bushes: [
      { x: 100, y: 100, w: 250, h: 250 },
      { x: 1650, y: 100, w: 250, h: 250 },
      { x: 100, y: 1650, w: 250, h: 250 },
      { x: 1650, y: 1650, w: 250, h: 250 },
      { x: 900, y: 300, w: 200, h: 100 },
      { x: 900, y: 1600, w: 200, h: 100 },
    ],
    jumpPads: [
      { x: 1000, y: 100, radius: 40, force: 20, angle: -Math.PI / 2 },
      { x: 1000, y: 1900, radius: 40, force: 20, angle: Math.PI / 2 },
      { x: 100, y: 1000, radius: 40, force: 20, angle: Math.PI },
      { x: 1900, y: 1000, radius: 40, force: 20, angle: 0 },
    ],
  },
  DESERT: {
    id: 'desert',
    name: 'Stoffige Duinen',
    color: '#78350f', // amber-900
    gridColor: '#92400e',
    worldSize: { width: 2500, height: 1800 },
    image: 'https://picsum.photos/seed/desert-game/800/600',
    obstacles: [
      { x: 200, y: 200, w: 100, h: 1400 },
      { x: 2200, y: 200, w: 100, h: 1400 },
      { x: 600, y: 800, w: 1300, h: 100 },
    ],
    bushes: [
      { x: 400, y: 400, w: 400, h: 150 },
      { x: 1700, y: 400, w: 400, h: 150 },
      { x: 400, y: 1200, w: 400, h: 150 },
      { x: 1700, y: 1200, w: 400, h: 150 },
    ],
  },
  FOREST: {
    id: 'forest',
    name: 'Wilde Wouden',
    color: '#064e3b', // emerald-950
    gridColor: '#065f46',
    worldSize: { width: 1800, height: 1800 },
    image: 'https://picsum.photos/seed/forest-game/800/600',
    obstacles: [
      { x: 300, y: 300, w: 300, h: 80 },
      { x: 1200, y: 1200, w: 300, h: 80 },
      { x: 300, y: 1200, w: 80, h: 300 },
      { x: 1200, y: 300, w: 80, h: 300 },
    ],
    bushes: [
      { x: 0, y: 0, w: 300, h: 300 },
      { x: 1500, y: 0, w: 300, h: 300 },
      { x: 0, y: 1500, w: 300, h: 300 },
      { x: 1500, y: 1500, w: 300, h: 300 },
      { x: 800, y: 800, w: 200, h: 200 },
    ],
  },
  FOOTBALL: {
    id: 'football',
    name: 'Brawl Bal Arena',
    color: '#166534', // green-800
    gridColor: '#15803d', // green-700
    worldSize: { width: 2000, height: 1200 },
    image: 'https://picsum.photos/seed/football-pitch/800/600',
    isFootball: true,
    obstacles: [
       // Side borders removed to allow exit
       // Goal back walls
       { x: 0, y: 50, w: 50, h: 400 },
       { x: 0, y: 750, w: 50, h: 450 },
       { x: 1950, y: 50, w: 50, h: 400 },
       { x: 1950, y: 750, w: 50, h: 450 },
    ],
    bushes: [
       { x: 400, y: 200, w: 200, h: 200 },
       { x: 1400, y: 200, w: 200, h: 200 },
       { x: 400, y: 800, w: 200, h: 200 },
       { x: 1400, y: 800, w: 200, h: 200 },
    ],
    jumpPads: [
       { x: 1000, y: 100, radius: 40, force: 25, angle: -Math.PI / 2 },
       { x: 1000, y: 1100, radius: 40, force: 25, angle: Math.PI / 2 },
    ],
    goals: [
       { team: 'RED', x: 0, y: 450, w: 60, h: 300 },
       { team: 'BLUE', x: 1940, y: 450, w: 60, h: 300 }
    ]
  },
};

export const BRAWLER_TYPES = {
  BALANCE: {
    name: 'Blokkie',
    health: 3000,
    speed: 4,
    damage: 800,
    cooldown: 500,
    range: 450,
    radius: 25,
    color: '#3b82f6', // blue-500
    image: 'https://picsum.photos/seed/warrior-block/400/400',
  },
  TANK: {
    name: 'Sloper',
    health: 6000,
    speed: 3,
    damage: 1200,
    cooldown: 1000,
    range: 200,
    radius: 35,
    color: '#ef4444', // red-500
    image: 'https://picsum.photos/seed/tank-block/400/400',
  },
  SNIPER: {
    name: 'Scherpschutter',
    health: 2200,
    speed: 5,
    damage: 1100,
    cooldown: 900,
    range: 700,
    radius: 20,
    color: '#10b981', // emerald-500
    image: 'https://picsum.photos/seed/archer-block/400/400',
  },
  ASSASSIN: {
    name: 'Ninja',
    health: 2800,
    speed: 6.5,
    damage: 900,
    cooldown: 400,
    range: 150,
    radius: 22,
    color: '#a855f7', // purple-500
    image: 'https://picsum.photos/seed/ninja-block/400/400',
  },
  WIZARD: {
    name: 'Magier',
    health: 2400,
    speed: 4,
    damage: 1400,
    cooldown: 1200,
    range: 500,
    radius: 24,
    color: '#ec4899', // pink-500
    image: 'https://picsum.photos/seed/wizard-block/400/400',
  },
};
