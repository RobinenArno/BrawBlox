import { Point, Brawler, Projectile, GameState, BRAWLER_TYPES, EntityType, MAPS, MapConfig, PowerUp, Team, KILLS_TO_WIN, START_POWER_LEVEL } from '../types';
import { getDistance, getRandomInt } from '../lib/utils';

export class GameEngine {
  state: GameState;
  onStateUpdate: (state: GameState) => void;
  lastTime: number = 0;
  isRunning: boolean = false;

  constructor(onStateUpdate: (state: GameState) => void, mapKey: keyof typeof MAPS = 'ARENA') {
    this.onStateUpdate = onStateUpdate;
    this.state = {
      players: {},
      projectiles: [],
      powerups: [],
      ball: MAPS[mapKey].isFootball ? {
        id: 'football',
        type: 'FOOTBALL',
        pos: { x: MAPS[mapKey].worldSize.width / 2, y: MAPS[mapKey].worldSize.height / 2 },
        vel: { x: 0, y: 0 },
        radius: 30,
        color: '#ffffff',
        friction: 0.98,
      } : undefined,
      map: MAPS[mapKey],
      teamScores: { RED: 0, BLUE: 0, NONE: 0 },
    };
  }

  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
    this.spawnBots(8);
  }

  stop() {
    this.isRunning = false;
  }

  addPlayer(id: string, brawlerType: keyof typeof BRAWLER_TYPES, name?: string, team: Team = 'BLUE') {
    const config = BRAWLER_TYPES[brawlerType];
    this.state.players[id] = {
      id,
      type: 'PLAYER',
      pos: { x: this.getRandomEmptyPos().x, y: this.getRandomEmptyPos().y },
      vel: { x: 0, y: 0 },
      radius: config.radius * (1 + START_POWER_LEVEL * 0.2),
      baseRadius: config.radius,
      color: config.color,
      health: config.health * 1.5,
      maxHealth: config.health * 1.5,
      speed: config.speed,
      damage: config.damage * 1.25,
      attackCooldown: config.cooldown * 0.8,
      lastAttackTime: 0,
      name: name || config.name,
      score: 0,
      angle: 0,
      powerLevel: START_POWER_LEVEL,
      team,
      image: config.image,
      range: config.range,
    };
    this.spawnPowerUps(20);
  }

  spawnPowerUps(count: number) {
    for (let i = 0; i < count; i++) {
        const pos = this.getRandomEmptyPos();
        this.state.powerups.push({
            id: `pwr-${Math.random()}`,
            type: 'POWERUP',
            pos,
            vel: { x: 0, y: 0 },
            radius: 15,
            color: '#fbbf24', // amber-400
            value: 600,
        });
    }
  }

  getRandomEmptyPos(): Point {
    let pos: Point;
    let collision = true;
    let attempts = 0;
    do {
        pos = { 
            x: getRandomInt(100, this.state.map.worldSize.width - 100), 
            y: getRandomInt(100, this.state.map.worldSize.height - 100) 
        };
        collision = this.state.map.obstacles.some(ob => 
            pos.x > ob.x - 20 && pos.x < ob.x + ob.w + 20 &&
            pos.y > ob.y - 20 && pos.y < ob.y + ob.h + 20
        );
        attempts++;
    } while (collision && attempts < 100);
    return pos;
  }

  spawnBots(count: number) {
    const types: (keyof typeof BRAWLER_TYPES)[] = Object.keys(BRAWLER_TYPES) as any;
    for (let i = 0; i < count; i++) {
        const id = `bot-${Math.random().toString(36).substr(2, 9)}`;
        const type = types[getRandomInt(0, types.length - 1)];
        const config = BRAWLER_TYPES[type];
        // Split bots between teams
        const team: Team = i % 2 === 0 ? 'RED' : 'BLUE';
        
        this.state.players[id] = {
            id,
            type: 'BOT',
            pos: this.getRandomEmptyPos(),
            vel: { x: 0, y: 0 },
            radius: config.radius,
            baseRadius: config.radius,
            color: config.color,
            health: config.health * 0.7,
            maxHealth: config.health * 0.7,
            speed: config.speed * 0.7,
            damage: config.damage * 0.4,
            attackCooldown: config.cooldown + 600,
            lastAttackTime: 0,
            name: `${config.name} Bot`,
            score: 0,
            angle: Math.random() * Math.PI * 2,
            powerLevel: 0,
            team,
            image: config.image,
            range: config.range,
        };
    }
  }

  updateInput(id: string, moveDir: Point, aimAngle: number, isAttacking: boolean) {
    const p = this.state.players[id];
    if (!p) return;

    p.vel = {
      x: moveDir.x * p.speed,
      y: moveDir.y * p.speed,
    };
    p.angle = aimAngle;

    if (isAttacking) {
      this.shoot(id);
    }
  }

  shoot(id: string) {
    const p = this.state.players[id];
    if (!p || performance.now() - p.lastAttackTime < p.attackCooldown) return;

    p.lastAttackTime = performance.now();
    
    this.state.projectiles.push({
      id: Math.random().toString(),
      type: 'PROJECTILE',
      ownerId: id,
      pos: { ...p.pos },
      vel: {
        x: Math.cos(p.angle) * 15,
        y: Math.sin(p.angle) * 15,
      },
      radius: 8,
      color: p.color,
      damage: p.damage,
      distanceTraveled: 0,
      maxDistance: p.range,
      team: p.team,
    });
  }

  loop(now: number) {
    if (!this.isRunning) return;
    const dt = (now - this.lastTime) / 16.67;
    this.lastTime = now;

    this.update(dt);
    this.onStateUpdate({ ...this.state });
    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt: number) {
    Object.values(this.state.players).forEach(p => {
      if (p.health <= 0) return;

      if (p.type === 'BOT') {
        this.state.map.isFootball ? this.updateFootballBot(p) : this.updateBot(p);
      }

      const limitedDt = Math.min(dt, 2);
      const nextX = p.pos.x + p.vel.x * limitedDt;
      const nextY = p.pos.y + p.vel.y * limitedDt;

      // Obstacle collision
      let canMoveX = true;
      let canMoveY = true;
      
      this.state.map.obstacles.forEach(ob => {
          // Check X collision
          const collidesX = nextX + p.radius > ob.x && nextX - p.radius < ob.x + ob.w &&
                            p.pos.y + p.radius > ob.y && p.pos.y - p.radius < ob.y + ob.h;
          if (collidesX) {
            // Is it moving TOWARDS the wall or AWAY?
            // If the current position already collides, allow moving if it helps escape
            const currentCollidesX = p.pos.x + p.radius > ob.x && p.pos.x - p.radius < ob.x + ob.w &&
                                     p.pos.y + p.radius > ob.y && p.pos.y - p.radius < ob.y + ob.h;
            
            if (currentCollidesX) {
              const currentOverlap = Math.min(p.pos.x + p.radius - ob.x, ob.x + ob.w - (p.pos.x - p.radius));
              const nextOverlap = Math.min(nextX + p.radius - ob.x, ob.x + ob.w - (nextX - p.radius));
              if (nextOverlap > currentOverlap) canMoveX = false;
            } else {
              canMoveX = false;
            }
          }

          // Check Y collision
          const collidesY = nextY + p.radius > ob.y && nextY - p.radius < ob.y + ob.h &&
                            p.pos.x + p.radius > ob.x && p.pos.x - p.radius < ob.x + ob.w;
          if (collidesY) {
            const currentCollidesY = p.pos.y + p.radius > ob.y && p.pos.y - p.radius < ob.y + ob.h &&
                                     p.pos.x + p.radius > ob.x && p.pos.x - p.radius < ob.x + ob.w;
            
            if (currentCollidesY) {
              const currentOverlap = Math.min(p.pos.y + p.radius - ob.y, ob.y + ob.h - (p.pos.y - p.radius));
              const nextOverlap = Math.min(nextY + p.radius - ob.y, ob.h + ob.y - (nextY - p.radius));
              if (nextOverlap > currentOverlap) canMoveY = false;
            } else {
              canMoveY = false;
            }
          }
      });

      if (canMoveX) p.pos.x = nextX;
      if (canMoveY) p.pos.y = nextY;

      // Ball collision (Kicking)
      if (this.state.ball) {
        const ball = this.state.ball;
        const dist = getDistance(p.pos, ball.pos);
        if (dist < p.radius + ball.radius) {
          const angle = Math.atan2(ball.pos.y - p.pos.y, ball.pos.x - p.pos.x);
          const force = 12;
          ball.vel.x = Math.cos(angle) * force + p.vel.x * 0.5;
          ball.vel.y = Math.sin(angle) * force + p.vel.y * 0.5;
          ball.lastKickerId = p.id;
        }
      }

      // Bounds removed to allow movement outside the map
      
      // Regen
      if (p.type === 'PLAYER' && p.health < p.maxHealth) {
        p.health = Math.min(p.maxHealth, p.health + (p.maxHealth * 0.001 * dt));
      }

      // Bush detection
      p.isInBush = this.state.map.bushes.some(bush => 
        p.pos.x > bush.x && p.pos.x < bush.x + bush.w &&
        p.pos.y > bush.y && p.pos.y < bush.y + bush.h
      );

      // Jump Pad detection
      if (this.state.map.jumpPads) {
        this.state.map.jumpPads.forEach(pad => {
          if (getDistance(p.pos, { x: pad.x, y: pad.y }) < p.radius + pad.radius) {
            p.vel.x = Math.cos(pad.angle) * pad.force;
            p.vel.y = Math.sin(pad.angle) * pad.force;
          }
        });
      }

      // collection
      this.state.powerups = this.state.powerups.filter(pw => {
        if (getDistance(p.pos, pw.pos) < p.radius + pw.radius) {
            p.maxHealth += pw.value;
            p.health += pw.value;
            p.damage += 200; // Much more impact on damage
            p.powerLevel += 1;
            
            // Stronger Growth mechanic
            p.radius = p.baseRadius * (1 + p.powerLevel * 0.2); // Standardized to 20% per level
            p.range += 100; // Increase range significantly
            
            return false;
        }
        return true;
      });
    });

    if (this.state.powerups.length < 8) this.spawnPowerUps(12);

    // Ball physics
    if (this.state.ball) {
        const ball = this.state.ball;
        ball.pos.x += ball.vel.x * dt;
        ball.pos.y += ball.vel.y * dt;
        ball.vel.x *= ball.friction;
        ball.vel.y *= ball.friction;

        // Ball boundaries removed to allow it to be kicked out of the map

        // Jump Pad for ball
        if (this.state.map.jumpPads) {
          this.state.map.jumpPads.forEach(pad => {
            if (getDistance(ball.pos, { x: pad.x, y: pad.y }) < ball.radius + pad.radius) {
              ball.vel.x = Math.cos(pad.angle) * (pad.force * 1.5);
              ball.vel.y = Math.sin(pad.angle) * (pad.force * 1.5);
            }
          });
        }

        // Bounce off obstacles
        this.state.map.obstacles.forEach(ob => {
            if (ball.pos.x + ball.radius > ob.x && ball.pos.x - ball.radius < ob.x + ob.w &&
                ball.pos.y + ball.radius > ob.y && ball.pos.y - ball.radius < ob.y + ob.h) {
                // Simplified bounce
                if (ball.pos.x < ob.x || ball.pos.x > ob.x + ob.w) ball.vel.x *= -0.8;
                if (ball.pos.y < ob.y || ball.pos.y > ob.y + ob.h) ball.vel.y *= -0.8;
            }
        });

        // Goal check
        if (this.state.map.goals) {
            this.state.map.goals.forEach(goal => {
                if (ball.pos.x > goal.x && ball.pos.x < goal.x + goal.w &&
                    ball.pos.y > goal.y && ball.pos.y < goal.y + goal.h) {
                    // Goal scored!
                    const scoringTeam = goal.team === 'BLUE' ? 'RED' : 'BLUE'; // Opposed team scored
                    this.state.teamScores[scoringTeam]++;
                    this.resetPositions();
                }
            });
        }
    }

    this.state.projectiles = this.state.projectiles.filter(proj => {
      // Clamp dt to avoid jumping through walls
      const limitedDt = Math.min(dt, 2);
      proj.pos.x += proj.vel.x * limitedDt;
      proj.pos.y += proj.vel.y * limitedDt;
      proj.distanceTraveled += Math.sqrt(proj.vel.x**2 + proj.vel.y**2) * limitedDt;
      if (proj.distanceTraveled > proj.maxDistance) return false;

      // Projectiles now fly OVER walls, so wall collision check is removed
      
      // Player collision
      for (const p of Object.values(this.state.players)) {
        if (p.id === proj.ownerId || p.health <= 0) continue;
        // Team check: no friendly fire
        if (p.team === proj.team) continue;
        
        if (getDistance(proj.pos, p.pos) < proj.radius + p.radius) {
          p.health -= proj.damage;
          if (p.health <= 0) {
            const owner = this.state.players[proj.ownerId];
            if (owner) {
                owner.score += 1;
                // NEW RULE: Every kill makes you smaller
                owner.powerLevel = Math.max(-1, owner.powerLevel - 1);
                owner.radius = owner.baseRadius * (1 + owner.powerLevel * 0.2);
            }
          }
          return false;
        }
      }
      return proj.pos.x > 0 && proj.pos.x < this.state.map.worldSize.width &&
             proj.pos.y > 0 && proj.pos.y < this.state.map.worldSize.height;
    });

    Object.values(this.state.players).forEach(p => {
        // WIN/LOSS Logic
        if (p.type === 'PLAYER') {
            // WIN: 15 kills
            if (p.score >= KILLS_TO_WIN) {
                this.state.playerWon = true;
                this.stop();
            }
            // LOSS: Smaller than start status (baseRadius)
            if (p.powerLevel < 0 || p.radius < p.baseRadius) {
                this.state.playerLost = true;
                this.state.loseReason = 'SHRUNK';
                p.health = 0;
            }
        }

        if (p.type === 'BOT' && p.health <= 0) {
            p.health = p.maxHealth;
            p.pos = this.getRandomEmptyPos();
        }
    });
  }

  updateFootballBot(bot: Brawler) {
    if (!this.state.ball) return;
    const ball = this.state.ball;
    const distToBall = getDistance(bot.pos, ball.pos);
    
    // Logic: Chase the ball and push it towards the enemy goal
    const targetGoal = this.state.map.goals?.find(g => g.team === (bot.team === 'BLUE' ? 'RED' : 'BLUE'));
    
    if (targetGoal) {
        // Move to ball
        const angleToBall = Math.atan2(ball.pos.y - bot.pos.y, ball.pos.x - bot.pos.x);
        bot.angle = angleToBall;
        bot.vel = { x: Math.cos(angleToBall) * bot.speed, y: Math.sin(angleToBall) * bot.speed };
        
        // If close to ball, shoot at goal
        if (distToBall < 100) {
            const angleToGoal = Math.atan2(targetGoal.y + targetGoal.h/2 - ball.pos.y, targetGoal.x + targetGoal.w/2 - ball.pos.x);
            bot.angle = angleToGoal;
            this.shoot(bot.id);
        }
    }
  }

  resetPositions() {
    if (this.state.ball) {
        this.state.ball.pos = { x: this.state.map.worldSize.width / 2, y: this.state.map.worldSize.height / 2 };
        this.state.ball.vel = { x: 0, y: 0 };
    }
    Object.values(this.state.players).forEach(p => {
        p.pos = p.team === 'BLUE' 
            ? { x: 300, y: this.state.map.worldSize.height / 2 } 
            : { x: this.state.map.worldSize.width - 300, y: this.state.map.worldSize.height / 2 };
        p.health = p.maxHealth;
    });
  }

  updateBot(bot: Brawler) {
    let nearest: Brawler | null = null;
    let minDist = Infinity;
    Object.values(this.state.players).forEach(p => {
      if (p.id === bot.id || p.health <= 0) return;
      // Bot only targets other teams
      if (p.team === bot.team) return;
      
      // Stealth check: ignore players in bushes
      if (p.isInBush) return;
      
      const d = getDistance(bot.pos, p.pos);
      if (d < minDist) { minDist = d; nearest = p; }
    });

    if (nearest && minDist < 800) {
      const angle = Math.atan2(nearest.pos.y - bot.pos.y, nearest.pos.x - bot.pos.x);
      bot.angle = angle;
      if (minDist > 150) {
          bot.vel = { x: Math.cos(angle) * bot.speed, y: Math.sin(angle) * bot.speed };
      } else { bot.vel = { x: 0, y: 0 }; }
      if (minDist < 600) this.shoot(bot.id);
    } else {
      if (Math.random() < 0.02) {
          bot.angle = Math.random() * Math.PI * 2;
          bot.vel = { x: Math.cos(bot.angle) * bot.speed, y: Math.sin(bot.angle) * bot.speed };
      }
    }
  }
}
