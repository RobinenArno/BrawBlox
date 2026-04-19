/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { GameState, Brawler } from '../types';

interface RendererProps {
  state: GameState;
  playerId: string;
}

export const Renderer: React.FC<RendererProps> = ({ state, playerId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const imageCache = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    const getCachedImage = (src: string) => {
      if (!src) return null;
      if (!imageCache.current[src]) {
        const img = new Image();
        img.src = src;
        img.referrerPolicy = "no-referrer";
        imageCache.current[src] = img;
      }
      const cached = imageCache.current[src];
      return cached.complete ? cached : null;
    };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const player = state.players[playerId];
      const width = canvas.width = window.innerWidth;
      const height = canvas.height = window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      if (!player) return;

      // Camera offset
      const offsetX = width / 2 - player.pos.x;
      const offsetY = height / 2 - player.pos.y;

      // Draw Infinite Void Background
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset for full screen fill
      ctx.fillStyle = '#020617'; // slate-950 (Universal Void)
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.translate(offsetX, offsetY);

      // Draw World Background
      const bgImg = getCachedImage(state.map.image);
      const extent = 1000;
      if (bgImg) {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(bgImg, 0, 0, state.map.worldSize.width, state.map.worldSize.height);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = state.map.color;
        ctx.fillRect(-extent, -extent, state.map.worldSize.width + extent*2, state.map.worldSize.height + extent*2);
      }

      // Draw Infinite Grid (Extended)
      ctx.strokeStyle = state.map.gridColor;
      ctx.lineWidth = 2;
      const gridSize = 100;
      // Using existing extent variable
      for (let x = -extent; x <= state.map.worldSize.width + extent; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -extent);
        ctx.lineTo(x, state.map.worldSize.height + extent);
        ctx.stroke();
      }
      for (let y = -extent; y <= state.map.worldSize.height + extent; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-extent, y);
        ctx.lineTo(state.map.worldSize.width + extent, y);
        ctx.stroke();
      }

      // Draw Bushes
      state.map.bushes.forEach(bush => {
        ctx.fillStyle = '#166534'; // green-800
        ctx.globalAlpha = 0.8;
        ctx.fillRect(bush.x, bush.y, bush.w, bush.h);
        
        // Leaves pattern
        ctx.fillStyle = '#14532d'; // green-900
        for (let i = 0; i < 20; i++) {
          const lx = bush.x + (Math.sin(i * 1234) * 0.5 + 0.5) * bush.w;
          const ly = bush.y + (Math.cos(i * 5678) * 0.5 + 0.5) * bush.h;
          ctx.beginPath();
          ctx.arc(lx, ly, 15, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      });

      // Draw Goals (if football map)
      if (state.map.goals) {
        state.map.goals.forEach(goal => {
           ctx.save();
           ctx.fillStyle = goal.team === 'BLUE' ? '#3b82f6' : '#ef4444';
           ctx.globalAlpha = 0.2;
           ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
           
           // Goal Border
           ctx.strokeStyle = goal.team === 'BLUE' ? '#3b82f6' : '#ef4444';
           ctx.lineWidth = 10;
           ctx.globalAlpha = 0.8;
           ctx.strokeRect(goal.x, goal.y, goal.w, goal.h);
           
           // Goal Net effect
           ctx.strokeStyle = '#fff';
           ctx.lineWidth = 1;
           ctx.globalAlpha = 0.1;
           for(let gx = 0; gx < goal.w; gx += 10) {
              ctx.beginPath();
              ctx.moveTo(goal.x + gx, goal.y);
              ctx.lineTo(goal.x + gx, goal.y + goal.h);
              ctx.stroke();
           }
           ctx.restore();
        });
      }

      // Draw Obstacles (Walls)
      state.map.obstacles.forEach(ob => {
        ctx.fillStyle = '#64748b'; // slate-500
        ctx.strokeStyle = '#475569'; // slate-600
        ctx.lineWidth = 4;
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
        
        // Bricks pattern on walls
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        for (let bx = 0; bx < ob.w; bx += 40) {
            for (let by = 0; by < ob.h; by += 20) {
                ctx.strokeRect(ob.x + bx, ob.y + by, 40, 20);
            }
        }
      });

      // Draw Jump Pads
      if (state.map.jumpPads) {
        state.map.jumpPads.forEach(pad => {
          ctx.save();
          ctx.translate(pad.x, pad.y);
          
          // Glow effect
          const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8;
          ctx.beginPath();
          ctx.arc(0, 0, pad.radius * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(251, 191, 36, ${0.2 * pulse})`;
          ctx.fill();

          // Pad base
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, pad.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Arrow icon
          ctx.rotate(pad.angle);
          ctx.fillStyle = '#fbbf24';
          const s = pad.radius * 0.6;
          ctx.beginPath();
          ctx.moveTo(s, 0);
          ctx.lineTo(-s/2, -s);
          ctx.lineTo(-s/2, s);
          ctx.closePath();
          ctx.fill();
          
          ctx.restore();
        });
      }

      // Draw World Edge (Now permeable)
      ctx.setLineDash([20, 20]);
      ctx.strokeStyle = '#fbbf24'; // amber-400
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, state.map.worldSize.width, state.map.worldSize.height);
      ctx.setLineDash([]); // Reset
      
      // Edge Glow
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
      ctx.lineWidth = 30;
      ctx.strokeRect(-15, -15, state.map.worldSize.width + 30, state.map.worldSize.height + 30);

      // Draw Projectiles
      state.projectiles.forEach(proj => {
        ctx.save();
        ctx.translate(proj.pos.x, proj.pos.y);
        ctx.rotate(Date.now() / 100);
        
        // Flying Effect: High shadow to suggest altitude
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 10;
        
        ctx.fillStyle = proj.color;
        
        // Pulsating size to suggest "flying"
        const scale = 1 + Math.sin(Date.now() / 150) * 0.2;
        const s = proj.radius * scale;
        
        // Square projectiles (Roblox-like)
        ctx.fillRect(-s, -s, s * 2, s * 2);

        // Shine/Gloss
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(-s, -s, s, s);
        
        ctx.restore();
      });

      // Draw Football
      if (state.ball) {
          ctx.save();
          ctx.translate(state.ball.pos.x, state.ball.pos.y);
          
          // Ball Shadow
          ctx.save();
          ctx.translate(5, 15);
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.arc(0, 0, state.ball.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Ball Body
          ctx.rotate(Date.now() / 100);
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(0, 0, state.ball.radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Hexagon pattern (Soccer ball)
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          for(let i = 0; i < 6; i++) {
              const ang = (i / 6) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(Math.cos(ang) * state.ball.radius, Math.sin(ang) * state.ball.radius);
              ctx.stroke();
          }
          ctx.restore();
      }

      // Draw Power-ups
      state.powerups.forEach(pw => {
        ctx.save();
        ctx.translate(pw.pos.x, pw.pos.y);
        ctx.rotate(Date.now() / 500);
        ctx.fillStyle = pw.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = pw.color;
        
        // Cube powerup
        ctx.fillRect(-pw.radius, -pw.radius, pw.radius * 2, pw.radius * 2);
        // Stud on top (Roblox style)
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, pw.radius / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Players
      Object.values(state.players).forEach((p: Brawler) => {
        if (p.health <= 0) return;

        // Visibility check: Hide enemies in bushes
        const isEnemy = p.team !== player.team;
        if (p.isInBush && isEnemy && p.id !== playerId) {
            // Only reveal if the player is also in the same bush? 
            // For now, let's keep it simple: invisible to enemies if in bush
            return;
        }

        // Team Indicator Ring
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = p.team === 'BLUE' ? '#3b82f6' : '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Character Shadow (3D depth)
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.translate(5, 5); // Offset shadow
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);
        
        // Apply bush transparency
        if (p.isInBush) {
          ctx.globalAlpha = 0.5;
        }

        // Bobbing animation
        const bob = Math.sin(Date.now() / 200) * 5;
        ctx.translate(0, bob);
        
        // Tilt based on velocity (makes it feel more dynamic)
        const tilt = p.vel.x * 0.05;
        ctx.rotate(tilt);

        // Movement animation for limbs (The "Poppetje" legs/arms)
        const moveTime = Date.now() / 150;
        const walkCycle = Math.sin(moveTime);
        const isMoving = Math.abs(p.vel.x) > 0.5 || Math.abs(p.vel.y) > 0.5;

        if (isMoving) {
          ctx.save();
          ctx.fillStyle = p.team === 'BLUE' ? '#1d4ed8' : '#b91c1c'; // Darker team color for limbs
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2 * (p.radius / 25); // Scale line width with brawler size

          // Legs (Swing back and forth)
          const legSwing = walkCycle * (p.radius * 0.5);
          // Left Leg
          ctx.beginPath();
          ctx.roundRect(-p.radius * 0.6, p.radius * 0.2 + legSwing, p.radius * 0.4, p.radius * 0.6, 5);
          ctx.fill();
          ctx.stroke();
          // Right Leg
          ctx.beginPath();
          ctx.roundRect(p.radius * 0.2, p.radius * 0.2 - legSwing, p.radius * 0.4, p.radius * 0.6, 5);
          ctx.fill();
          ctx.stroke();

          // Arms (Opposite swing)
          const armSwing = -walkCycle * (p.radius * 0.4);
          // Left Arm
          ctx.beginPath();
          ctx.roundRect(-p.radius * 1.1, -p.radius * 0.2 + armSwing, p.radius * 0.3, p.radius * 0.7, 5);
          ctx.fill();
          ctx.stroke();
          // Right Arm
          ctx.beginPath();
          ctx.roundRect(p.radius * 0.8, -p.radius * 0.2 - armSwing, p.radius * 0.3, p.radius * 0.7, 5);
          ctx.fill();
          ctx.stroke();
          
          ctx.restore();
        }

        // Body Glow (Team based)
        ctx.shadowBlur = p.id === playerId ? 40 : 15;
        ctx.shadowColor = p.team === 'BLUE' ? '#3b82f6' : '#ef4444';

        // Draw Character Image
        const charImg = getCachedImage(p.image);
        if (charImg) {
          // Circular Clip for character (The "Poppetje" head/body)
          ctx.save();
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(charImg, -p.radius, -p.radius, p.radius * 2, p.radius * 2);
          ctx.restore();
          
          // Glossy Overlay for a "toy figure" look
          const gradient = ctx.createLinearGradient(-p.radius, -p.radius, p.radius, p.radius);
          gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
          gradient.addColorStop(0.5, 'transparent');
          gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();

          // Character Border
          ctx.strokeStyle = p.team === 'BLUE' ? '#60a5fa' : '#f87171';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Fallback if image not loaded
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
        }

        ctx.restore();

        // Power Level indicator (Cubes)
        if (p.powerLevel > 0) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'black 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`⚡ ${p.powerLevel}`, p.pos.x, p.pos.y + p.radius + 20);
        }

        // Health Bar
        const barWidth = p.radius * 2.5;
        const barHeight = 8;
        const healthPercent = p.health / p.maxHealth;
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(p.pos.x - barWidth / 2, p.pos.y - p.radius - 20, barWidth, barHeight);
        
        // Team colored health bar
        ctx.fillStyle = p.team === 'BLUE' ? '#3b82f6' : '#ef4444';
        ctx.fillRect(p.pos.x - barWidth / 2, p.pos.y - p.radius - 20, barWidth * healthPercent, barHeight);

        // Name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, p.pos.x, p.pos.y - p.radius - 25);
      });

      ctx.restore();
    };

    render();
  }, [state, playerId]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 bg-slate-900 cursor-crosshair outline-none"
      id="game-canvas"
      tabIndex={0}
    />
  );
};
