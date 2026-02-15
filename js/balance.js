/**
 * balance.js — Centralized game balance constants.
 * No logic file should contain raw numbers; they must import from here.
 */

// ─── Movement ───────────────────────────────────────────
export const WANDER_SPEED = 0.25;
export const SEPARATION_DIST = 0.5;
export const REPULSION_FORCE = 0.05;
export const VELOCITY_DAMPING = 0.9;

// ─── Metabolism ─────────────────────────────────────────
export const STARVATION_DAMAGE = 0.5;
export const GRAZING_HUNGER_RESTORE = 40;

// ─── Environment / Explosions ───────────────────────────
export const FIRE_DAMAGE_PER_TICK = 2.0;
export const EXPLOSION_FIRE_CHANCE = 0.7;
export const EXPLOSION_MAX_DAMAGE = 50;
export const DEFAULT_EXPLOSION_RADIUS = 4;

// ─── Zombie AI ──────────────────────────────────────────
export const ZOMBIE_SPEED = 0.15;
export const ZOMBIE_ATTACK_RANGE = 1.0;
export const ZOMBIE_SEARCH_RADIUS = 20;
export const ZOMBIE_ATTACK_DAMAGE = 0.5;

// ─── Human AI ───────────────────────────────────────────
export const HUMAN_SPEED = 0.25;
export const HUMAN_RUN_SPEED = 0.3;
export const ZOMBIE_DETECTION_RADIUS = 8;
export const HUMAN_ATTACK_DAMAGE = 1.0;

// ─── Automata ───────────────────────────────────────────
export const FIRE_SPREAD_CHANCE = 0.04;
export const FIRE_DECAY_CHANCE = 0.06;
export const GRASS_GROWTH_CHANCE = 0.3;
export const TICKS_PER_CHUNK = 3;
