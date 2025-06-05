export enum TileType {
  WAN = "wan",      // 万
  TIAO = "tiao",    // 条
  TONG = "tong",    // 筒
  ZI = "zi"         // 字牌
}

export interface Tile {
  type: TileType;
  value: number;
  id?: string;      // 添加牌的唯一标识
}

export enum MeldType {
  PENG = "peng",    // 碰
  GANG = "gang",    // 杠
  CHI = "chi"       // 吃
}

export enum GangType {
  MING_GANG = "ming_gang",  // 明杠（直杠）
  AN_GANG = "an_gang",      // 暗杠
  JIA_GANG = "jia_gang"     // 加杠
}

export interface Meld {
  id?: string;      // 添加唯一标识
  type: MeldType;
  tiles: Tile[];
  exposed: boolean;
  gang_type?: GangType; // 杠牌类型（仅当type为GANG时有效）
  source_player?: number;        // 直杠时：被杠牌的来源玩家ID
  original_peng_id?: string;     // 加杠时：原碰牌的ID
  timestamp?: number;            // 操作时间戳
}

export interface HandTiles {
  tiles: Tile[];
  melds: Meld[];
}

export interface PlayerAction {
  player_id: number;
  action_type: string;
  tiles: Tile[];
  timestamp?: number;
}

export interface GameState {
  player_hands: { [key: number]: HandTiles };
  discarded_tiles: Tile[];
  player_discarded_tiles?: { [key: number]: Tile[] };
  remaining_tiles: Tile[];
  current_player: number;
  actions_history: PlayerAction[];
}

export interface AnalysisResult {
  recommended_discard?: Tile;
  discard_scores: { [key: string]: number };
  listen_tiles: Tile[];
  win_probability: number;
  remaining_tiles_count: { [key: number]: number };
  suggestions: string[];
}

export interface GameRequest {
  game_state: GameState;
  target_player: number;
}

export interface GameResponse {
  success: boolean;
  analysis?: AnalysisResult;
  message: string;
}

export interface TileInfo {
  code: number;
  type: string;
  value: number;
  display: string;
}

// 输入模式枚举
export enum InputMode {
  ADD_TO_HAND = "add_to_hand",
  DISCARD = "discard", 
  PENG = "peng",
  MING_GANG = "ming_gang",
  AN_GANG = "an_gang"
}

// 工具函数
export const createTile = (type: TileType, value: number): Tile => ({
  type,
  value
});

export const tileToCode = (tile: Tile): number => {
  switch (tile.type) {
    case TileType.WAN:
      return tile.value;
    case TileType.TIAO:
      return tile.value + 10;
    case TileType.TONG:
      return tile.value + 20;
    case TileType.ZI:
      return tile.value + 30;
    default:
      throw new Error(`Invalid tile type: ${tile.type}`);
  }
};

export const codeToTile = (code: number): Tile => {
  if (1 <= code && code <= 9) {
    return { type: TileType.WAN, value: code };
  } else if (11 <= code && code <= 19) {
    return { type: TileType.TIAO, value: code - 10 };
  } else if (21 <= code && code <= 29) {
    return { type: TileType.TONG, value: code - 20 };
  } else if (31 <= code && code <= 37) {
    return { type: TileType.ZI, value: code - 30 };
  } else {
    throw new Error(`Invalid tile code: ${code}`);
  }
};

export const tileToString = (tile: Tile): string => {
  const typeMap = {
    [TileType.WAN]: "万",
    [TileType.TIAO]: "条", 
    [TileType.TONG]: "筒",
    [TileType.ZI]: ["", "东", "南", "西", "北", "中", "发", "白"][tile.value] || ""
  };
  
  if (tile.type === TileType.ZI) {
    return typeMap[tile.type];
  } else {
    return `${tile.value}${typeMap[tile.type]}`;
  }
};

export const tilesEqual = (tile1: Tile, tile2: Tile): boolean => {
  return tile1.type === tile2.type && tile1.value === tile2.value;
};

// 计算剩余牌数
export const calculateRemainingTiles = (gameState: GameState): number => {
  const totalTiles = 144; // 标准麻将总牌数
  
  // 计算已使用的牌数
  let usedTiles = 0;
  
  // 计算所有玩家手牌数量
  Object.values(gameState.player_hands).forEach(hand => {
    usedTiles += hand.tiles.length;
    // 计算碰牌杠牌数量
    hand.melds.forEach(meld => {
      usedTiles += meld.tiles.length;
    });
  });
  
  // 计算弃牌数量
  usedTiles += gameState.discarded_tiles.length;
  
  return Math.max(0, totalTiles - usedTiles);
}; 