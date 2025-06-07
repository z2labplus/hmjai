import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  GameState, 
  AnalysisResult, 
  Tile, 
  HandTiles, 
  PlayerAction,
  TileInfo,
  MeldType,
  Meld,
  TileType,
  GangType
} from '../types/mahjong';
import MahjongApiClient from '../services/apiClient';

interface GameStore {
  // 游戏状态
  gameState: GameState;
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  
  // 可用牌信息
  availableTiles: TileInfo[];
  
  // WebSocket连接状态
  isConnected: boolean;
  connectionId: string | null;
  
  // API连接状态
  isApiConnected: boolean;
  lastSyncTime: Date | null;
  
  // Actions
  setGameState: (gameState: GameState) => void;
  setAnalysisResult: (result: AnalysisResult) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setAvailableTiles: (tiles: TileInfo[]) => void;
  setConnectionStatus: (connected: boolean, id?: string) => void;
  
  // 游戏操作
  addTileToHand: (playerId: number, tile: Tile) => void;
  removeTileFromHand: (playerId: number, tile: Tile) => void;
  reduceHandTilesCount: (playerId: number, count: number, preferredTile?: Tile) => void;
  addDiscardedTile: (tile: Tile, playerId: number) => void;
  addMeld: (playerId: number, meld: Meld) => void;
  reorderPlayerHand: (playerId: number, newTiles: Tile[]) => void;
  addAction: (action: PlayerAction) => void;
  
  // API同步功能
  syncFromBackend: () => Promise<void>;
  syncToBackend: () => Promise<void>;
  setApiConnectionStatus: (connected: boolean) => void;
  
  // 重置功能
  resetGame: () => void;
  clearAnalysis: () => void;
}

// 初始游戏状态
const initialGameState: GameState = {
  game_id: '',
  player_hands: {
    '0': { tiles: [], melds: [] },
    '1': { tiles: [], melds: [] },
    '2': { tiles: [], melds: [] },
    '3': { tiles: [], melds: [] }
  },
  current_player: 0,
  discarded_tiles: [],
  player_discarded_tiles: {
    '0': [],
    '1': [],
    '2': [],
    '3': []
  },
  actions_history: [],
  game_started: false
};

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    gameState: initialGameState,
    analysisResult: null,
    isAnalyzing: false,
    availableTiles: [],
    isConnected: false,
    connectionId: null,
    
    // API状态初始化
    isApiConnected: false,
    lastSyncTime: null,
    
    // Setters
    setGameState: (gameState) => set({ gameState }),
    
    setAnalysisResult: (result) => set({ analysisResult: result }),
    
    setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
    
    setAvailableTiles: (tiles) => set({ availableTiles: tiles }),
    
    setConnectionStatus: (connected, id) => 
      set({ isConnected: connected, connectionId: id || null }),
    
    // 游戏操作
    addTileToHand: (playerId, tile) => set((state) => {
      const newGameState = { ...state.gameState };
      const playerHand = { ...newGameState.player_hands[playerId] };
      playerHand.tiles = [...playerHand.tiles, tile];
      newGameState.player_hands[playerId] = playerHand;
      
      return { gameState: newGameState };
    }),
    
    removeTileFromHand: (playerId, tileToRemove) => set((state) => {
      const newGameState = { ...state.gameState };
      const playerHand = { ...newGameState.player_hands[playerId] };
      
      // 找到第一个匹配的牌并移除
      const tileIndex = playerHand.tiles.findIndex(tile => 
        tile.type === tileToRemove.type && tile.value === tileToRemove.value
      );
      
      if (tileIndex !== -1) {
        playerHand.tiles = [
          ...playerHand.tiles.slice(0, tileIndex),
          ...playerHand.tiles.slice(tileIndex + 1)
        ];
        newGameState.player_hands[playerId] = playerHand;
      }
      
      return { gameState: newGameState };
    }),

    reduceHandTilesCount: (playerId, count, preferredTile) => set((state) => {
      const newGameState = { ...state.gameState };
      const playerHand = { ...newGameState.player_hands[playerId] };
      let tiles = [...playerHand.tiles];
      
      // 确保手牌足够
      while (tiles.length < count) {
        // 如果手牌不够，添加通用牌
        const genericTile = { type: 'wan' as TileType, value: 1 };
        tiles.push(genericTile);
      }
      
      // 减少指定数量的牌
      for (let i = 0; i < count && tiles.length > 0; i++) {
        if (preferredTile) {
          // 优先移除指定类型的牌
          const preferredIndex = tiles.findIndex(tile => 
            tile.type === preferredTile.type && tile.value === preferredTile.value
          );
          if (preferredIndex !== -1) {
            tiles.splice(preferredIndex, 1);
            continue;
          }
        }
        // 移除第一张牌
        tiles.shift();
      }
      
      playerHand.tiles = tiles;
      newGameState.player_hands[playerId] = playerHand;
      
      return { gameState: newGameState };
    }),
    
    addDiscardedTile: (tile, playerId = 0) => set((state) => {
      const newGameState = { ...state.gameState };
      
      // 添加到全局弃牌池（保持兼容性）
      newGameState.discarded_tiles = [...newGameState.discarded_tiles, tile];
      
      // 添加到指定玩家的弃牌池
      if (newGameState.player_discarded_tiles) {
        newGameState.player_discarded_tiles = {
          ...newGameState.player_discarded_tiles,
          [playerId]: [...(newGameState.player_discarded_tiles[playerId] || []), tile]
        };
      } else {
        newGameState.player_discarded_tiles = {
          0: playerId === 0 ? [tile] : [],
          1: playerId === 1 ? [tile] : [],
          2: playerId === 2 ? [tile] : [],
          3: playerId === 3 ? [tile] : []
        };
      }
      
      return { gameState: newGameState };
    }),
    
    addMeld: (playerId, meld) => set((state) => {
      const newGameState = { ...state.gameState };
      const playerHand = { ...newGameState.player_hands[playerId] };
      playerHand.melds = [...playerHand.melds, meld];
      newGameState.player_hands[playerId] = playerHand;
      
      return { gameState: newGameState };
    }),
    
    // 重新排序玩家手牌
    reorderPlayerHand: (playerId, newTiles) => set((state) => {
      const newGameState = { ...state.gameState };
      const playerIdStr = playerId.toString();
      newGameState.player_hands[playerIdStr] = {
        ...newGameState.player_hands[playerIdStr],
        tiles: newTiles
      };
      return { gameState: newGameState };
    }),
    
    addAction: (action) => set((state) => {
      const newGameState = { ...state.gameState };
      newGameState.actions_history = [...newGameState.actions_history, action];
      return { gameState: newGameState };
    }),
    
    // 重置功能
    resetGame: () => set({
      gameState: initialGameState,
      analysisResult: null,
      isAnalyzing: false
    }),
    
    clearAnalysis: () => set({ analysisResult: null }),
    
    // API同步功能实现
    syncFromBackend: async () => {
      try {
        const backendState = await MahjongApiClient.getGameState();
        set({
          gameState: backendState,
          isApiConnected: true,
          lastSyncTime: new Date()
        });
        console.log('✅ 从后端同步状态成功');
      } catch (error) {
        console.error('❌ 从后端同步状态失败:', error);
        set({ isApiConnected: false });
      }
    },
    
    syncToBackend: async () => {
      try {
        const currentState = get().gameState;
        await MahjongApiClient.setGameState(currentState);
        set({
          isApiConnected: true,
          lastSyncTime: new Date()
        });
        console.log('✅ 同步状态到后端成功');
      } catch (error) {
        console.error('❌ 同步状态到后端失败:', error);
        set({ isApiConnected: false });
      }
    },
    
    setApiConnectionStatus: (connected: boolean) => {
      set({ isApiConnected: connected });
    }
  }))
);

// 选择器函数，用于获取特定数据
export const selectPlayerHand = (playerId: number) => (state: GameStore) => 
  state.gameState.player_hands[playerId];

export const selectMyHand = () => (state: GameStore) => 
  state.gameState.player_hands[0]; // 假设玩家ID为0

export const selectDiscardedTiles = () => (state: GameStore) => 
  state.gameState.discarded_tiles;

export const selectPlayerDiscardedTiles = (playerId: number) => (state: GameStore) => 
  state.gameState.player_discarded_tiles?.[playerId] || [];

export const selectAnalysis = () => (state: GameStore) => 
  state.analysisResult;

export const selectIsAnalyzing = () => (state: GameStore) => 
  state.isAnalyzing; 