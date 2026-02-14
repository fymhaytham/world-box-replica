// ─── Tile IDs ───────────────────────────────────────────
export const TILE = {
    WATER_DEEP: 0,
    WATER: 1,
    SAND: 2,
    DIRT: 3,
    GRASS: 4,
    FOREST: 5,
    STONE: 6,
    SNOW: 7,
    FIRE: 8,
    LAVA: 9,
};

// ─── Tile Colors (top-down terrain palette) ─────────────
export const TILE_COLOR = {
    [TILE.WATER_DEEP]: '#1565C0',
    [TILE.WATER]: '#42A5F5',
    [TILE.SAND]: '#E8D68E',
    [TILE.DIRT]: '#9C7A4F',
    [TILE.GRASS]: '#66BB6A',
    [TILE.FOREST]: '#2E7D32',
    [TILE.STONE]: '#78909C',
    [TILE.SNOW]: '#ECEFF1',
    [TILE.FIRE]: '#FF5722',
    [TILE.LAVA]: '#E65100',
};

// A second shade for natural per-tile visual variation
export const TILE_COLOR_ALT = {
    [TILE.WATER_DEEP]: '#0D47A1',
    [TILE.WATER]: '#2196F3',
    [TILE.SAND]: '#D4C47A',
    [TILE.DIRT]: '#8B6C42',
    [TILE.GRASS]: '#4CAF50',
    [TILE.FOREST]: '#1B5E20',
    [TILE.STONE]: '#607D8B',
    [TILE.SNOW]: '#CFD8DC',
    [TILE.FIRE]: '#FF7043',
    [TILE.LAVA]: '#BF360C',
};

// ─── Tile Properties ────────────────────────────────────
// Can agents walk on this tile?
export const TILE_WALKABLE = {
    [TILE.WATER_DEEP]: false,
    [TILE.WATER]: false,
    [TILE.SAND]: true,
    [TILE.DIRT]: true,
    [TILE.GRASS]: true,
    [TILE.FOREST]: true,
    [TILE.STONE]: false,
    [TILE.SNOW]: true,
    [TILE.FIRE]: false,
    [TILE.LAVA]: false,
};

// Does this tile have dynamic behavior? (fire, lava)
export const TILE_DYNAMIC = {
    [TILE.WATER_DEEP]: false,
    [TILE.WATER]: false,
    [TILE.SAND]: false,
    [TILE.DIRT]: false,
    [TILE.GRASS]: false,
    [TILE.FOREST]: false,
    [TILE.STONE]: false,
    [TILE.SNOW]: false,
    [TILE.FIRE]: true,
    [TILE.LAVA]: true,
};

// ─── World Dimensions ──────────────────────────────────
export const WORLD_W = 256;
export const WORLD_H = 256;
export const TILE_SIZE = 4;          // pixels per tile on screen (at zoom=1)

// ─── Chunk System ───────────────────────────────────────
export const CHUNK_SIZE = 16;        // tiles per chunk edge
export const CHUNKS_X = WORLD_W / CHUNK_SIZE;
export const CHUNKS_Y = WORLD_H / CHUNK_SIZE;

// ─── Timing ─────────────────────────────────────────────
export const LOGIC_TPS = 20;                       // logic ticks per second
export const LOGIC_STEP = 1000 / LOGIC_TPS;        // ms per logic tick

// ─── Tools ──────────────────────────────────────────────
export const TOOL = {
    GRASS: 'grass',
    FOREST: 'forest',
    SAND: 'sand',
    DIRT: 'dirt',
    WATER: 'water',
    STONE: 'stone',
    FIRE: 'fire',
    ERASE: 'erase',
    SPAWN_HUMAN: 'spawn_human',
    SPAWN_SHEEP: 'spawn_sheep',
    SPAWN_ZOMBIE: 'spawn_zombie',
};

// ─── Brush ──────────────────────────────────────────────
export const BRUSH_RADIUS = 3;
