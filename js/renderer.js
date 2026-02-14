import { TILE_SIZE, WORLD_W, WORLD_H } from './constants.js';

/**
 * Renderer: draws terrain + entities + kingdom info.
 * Top-down bird's-eye view.
 */
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this._worldPxW = WORLD_W * TILE_SIZE;
        this._worldPxH = WORLD_H * TILE_SIZE;

        this._resize();
        window.addEventListener('resize', () => this._resize());
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 48;
    }

    render(camera, chunkManager, world, entityManager, kingdomManager) {
        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        // Clear canvas
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cw, ch);

        // Apply camera
        camera.applyTransform(ctx);

        // Ocean fill in world-space — extends far beyond world bounds
        // so zoomed-out views show seamless ocean everywhere
        const pad = (WORLD_W + WORLD_H) * TILE_SIZE;   // generous overshoot
        ctx.fillStyle = '#0D47A1';
        ctx.fillRect(-pad, -pad, this._worldPxW + pad * 2, this._worldPxH + pad * 2);

        // Draw terrain
        chunkManager.draw(ctx, camera, world);

        // Draw kingdom territory markers
        if (kingdomManager) {
            this._drawKingdomCapitals(ctx, kingdomManager);
            this._drawWarArrows(ctx, kingdomManager);
        }

        // Draw entities
        if (entityManager) {
            this._drawEntities(ctx, entityManager, kingdomManager);
        }

        // Reset for HUD
        camera.resetTransform(ctx);
        this._drawHUD(ctx, entityManager, kingdomManager, camera);
    }

    _drawKingdomCapitals(ctx, km) {
        for (const [kid, k] of km.kingdoms) {
            const cx = k.capitalX * TILE_SIZE + TILE_SIZE / 2;
            const cy = k.capitalY * TILE_SIZE + TILE_SIZE / 2;
            const pop = k.members.size;

            // Radius scales with population (sqrt for visual balance)
            const baseR = TILE_SIZE * 2;
            const radius = baseR + Math.sqrt(pop) * TILE_SIZE * 1.2;

            // Territory glow
            ctx.fillStyle = k.color;
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Solid marker circle
            ctx.globalAlpha = 0.45;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();

            // Border ring
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = k.color;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Kingdom name + population label
            const fontSize = Math.max(3, TILE_SIZE * 1.5);
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Name above
            ctx.fillText(k.name, cx, cy - fontSize * 0.6);

            // Population count below name
            ctx.font = `${fontSize * 0.85}px Inter, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillText(`👥 ${pop}`, cx, cy + fontSize * 0.6);

            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
        }
    }

    _drawWarArrows(ctx, km) {
        for (const warKey of km.wars) {
            const [aIdStr, bIdStr] = warKey.split('-');
            const kA = km.kingdoms.get(Number(aIdStr));
            const kB = km.kingdoms.get(Number(bIdStr));
            if (!kA || !kB) continue;

            const ax = kA.capitalX * TILE_SIZE + TILE_SIZE / 2;
            const ay = kA.capitalY * TILE_SIZE + TILE_SIZE / 2;
            const bx = kB.capitalX * TILE_SIZE + TILE_SIZE / 2;
            const by = kB.capitalY * TILE_SIZE + TILE_SIZE / 2;

            const dx = bx - ax;
            const dy = by - ay;
            const len = Math.hypot(dx, dy) || 1;
            const nx = dx / len;
            const ny = dy / len;

            // Start/end slightly inset from capitals
            const inset = TILE_SIZE * 3;
            const x1 = ax + nx * inset;
            const y1 = ay + ny * inset;
            const x2 = bx - nx * inset;
            const y2 = by - ny * inset;

            // Red war line
            ctx.save();
            ctx.strokeStyle = '#F44336';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([TILE_SIZE, TILE_SIZE * 0.5]);
            ctx.globalAlpha = 0.7;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            ctx.setLineDash([]);

            // Arrowhead at B end
            const headSize = TILE_SIZE * 1.5;
            const angle = Math.atan2(dy, dx);
            ctx.fillStyle = '#F44336';
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - headSize * Math.cos(angle - 0.4), y2 - headSize * Math.sin(angle - 0.4));
            ctx.lineTo(x2 - headSize * Math.cos(angle + 0.4), y2 - headSize * Math.sin(angle + 0.4));
            ctx.closePath();
            ctx.fill();

            // Arrowhead at A end (bidirectional war)
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + headSize * Math.cos(angle - 0.4 + Math.PI), y1 + headSize * Math.sin(angle - 0.4 + Math.PI));
            ctx.lineTo(x1 + headSize * Math.cos(angle + 0.4 + Math.PI), y1 + headSize * Math.sin(angle + 0.4 + Math.PI));
            ctx.closePath();
            ctx.fill();

            // War icon at midpoint
            const mx = (ax + bx) / 2;
            const my = (ay + by) / 2;
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${TILE_SIZE * 1.5}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚔', mx, my);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.restore();
        }
    }

    _drawEntities(ctx, em, km) {
        for (const [id, pos] of em.positions) {
            const render = em.renders.get(id);
            if (!render) continue;

            const sx = pos.x * TILE_SIZE;
            const sy = pos.y * TILE_SIZE;
            const radius = (render.size * TILE_SIZE) / 2;

            // Get kingdom color if in one
            const kingdomColor = km ? km.getKingdomColor(id) : null;
            const baseColor = kingdomColor || render.color;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(sx + TILE_SIZE / 2, sy + TILE_SIZE / 2 + radius * 0.4, radius, radius * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body (kingdom color if member, default otherwise)
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(sx + TILE_SIZE / 2, sy + TILE_SIZE / 2, radius, 0, Math.PI * 2);
            ctx.fill();

            // Kingdom ring
            if (kingdomColor) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 0.4;
                ctx.stroke();
            } else {
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 0.3;
                ctx.stroke();
            }

            // Crown for kings
            const kid = km ? km.membership.get(id) : undefined;
            const isKing = kid !== undefined && km.kingdoms.get(kid)?.leaderId === id;
            if (isKing) {
                const cx = sx + TILE_SIZE / 2;
                const crownTop = sy + TILE_SIZE / 2 - radius * 1.15;
                const crownW = radius * 1.4;
                const crownH = radius * 0.7;

                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                // Crown base
                ctx.moveTo(cx - crownW, crownTop + crownH);
                ctx.lineTo(cx - crownW, crownTop + crownH * 0.3);
                // Left point
                ctx.lineTo(cx - crownW * 0.5, crownTop + crownH * 0.6);
                // Center point
                ctx.lineTo(cx, crownTop);
                // Right point
                ctx.lineTo(cx + crownW * 0.5, crownTop + crownH * 0.6);
                ctx.lineTo(cx + crownW, crownTop + crownH * 0.3);
                ctx.lineTo(cx + crownW, crownTop + crownH);
                ctx.closePath();
                ctx.fill();

                // Crown outline
                ctx.strokeStyle = '#B8860B';
                ctx.lineWidth = 0.3;
                ctx.stroke();
            }

            // Check personality (humans only)
            const pers = em.personalities.get(id);
            const hp = em.healths.get(id);
            const isDamaged = hp && hp.current < hp.max;

            // Health bar if damaged
            if (isDamaged) {
                const barW = TILE_SIZE * 1.2;
                const barH = 1;
                const bx = sx + TILE_SIZE / 2 - barW / 2;
                const by = sy - 1;

                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(bx, by, barW, barH);

                const pct = hp.current / hp.max;
                ctx.fillStyle = pct > 0.5 ? '#4CAF50' : pct > 0.25 ? '#FF9800' : '#F44336';
                ctx.fillRect(bx, by, barW * pct, barH);
            }

            // Personality number above head
            if (pers) {
                const pVal = pers.value;
                // Color by personality
                const PERS_COLORS = { 1: '#F44336', 2: '#FF9800', 3: '#FFFFFF', 4: '#00BCD4', 5: '#FFD700' };
                ctx.fillStyle = PERS_COLORS[pVal] || '#FFFFFF';
                const fontSize = Math.max(2, TILE_SIZE * 0.8);
                ctx.font = `bold ${fontSize}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                const label = `${pVal}`;

                // Position: above health bar if damaged, just above head if not
                const labelY = isDamaged ? sy - 2.5 : (isKing ? sy - 2 : sy - 0.5);
                ctx.fillText(label, sx + TILE_SIZE / 2, labelY);

                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
            }
        }
    }

    _drawHUD(ctx, em, km, camera) {
        const count = em ? em.positions.size : 0;
        const kingdomCount = km ? km.kingdoms.size : 0;
        const warCount = km ? km.wars.size : 0;

        // Bottom-left info panel
        const text = `Entities: ${count}  |  Kingdoms: ${kingdomCount}  |  Wars: ${warCount}  |  Zoom: ${camera.displayZoom.toFixed(1)}×`;
        const panelW = ctx.measureText ? 340 : 340;
        const panelH = 28;

        ctx.fillStyle = 'rgba(15,15,30,0.8)';
        ctx.beginPath();
        ctx.roundRect(8, this.canvas.height - panelH - 8, panelW, panelH, 6);
        ctx.fill();

        ctx.fillStyle = '#c0c0d8';
        ctx.font = '12px "Inter", monospace';
        ctx.fillText(text, 16, this.canvas.height - 16);

        // Kingdom legend (top-right)
        if (km && km.kingdoms.size > 0) {
            const legendH = km.kingdoms.size * 18 + 24;
            const legendW = 190;
            const lx = this.canvas.width - legendW - 8;
            const ly = 8;

            ctx.fillStyle = 'rgba(15,15,30,0.8)';
            ctx.beginPath();
            ctx.roundRect(lx, ly, legendW, legendH, 6);
            ctx.fill();

            ctx.fillStyle = '#999';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.fillText('KINGDOMS', lx + 10, ly + 16);

            const PERS_LABELS = { 1: '⚔', 2: '😤', 3: '👑', 4: '🕊', 5: '☮' };
            const PERS_HUD_COLORS = { 1: '#F44336', 2: '#FF9800', 3: '#ccc', 4: '#00BCD4', 5: '#FFD700' };

            let row = 0;
            for (const [kid, k] of km.kingdoms) {
                const ry = ly + 28 + row * 18;
                const atWar = [...km.wars].some(w => w.includes(`${kid}`));

                // Color dot
                ctx.fillStyle = k.color;
                ctx.beginPath();
                ctx.arc(lx + 14, ry, 4, 0, Math.PI * 2);
                ctx.fill();

                // King personality
                const kingPers = em ? em.personalities.get(k.leaderId) : null;
                const pVal = kingPers ? kingPers.value : 3;

                // Name + member count + personality
                ctx.fillStyle = '#ccc';
                ctx.font = '11px Inter, sans-serif';
                ctx.fillText(`${k.name} (${k.members.size})`, lx + 24, ry + 4);

                // Personality indicator
                ctx.fillStyle = PERS_HUD_COLORS[pVal] || '#ccc';
                ctx.font = '9px Inter, sans-serif';
                ctx.fillText(`${PERS_LABELS[pVal] || ''}${pVal}`, lx + legendW - 36, ry + 3);

                // War indicator
                if (atWar) {
                    ctx.fillStyle = '#F44336';
                    ctx.font = '9px Inter, sans-serif';
                    ctx.fillText('⚔️', lx + legendW - 24, ry + 3);
                }

                row++;
            }
        }
    }
}
