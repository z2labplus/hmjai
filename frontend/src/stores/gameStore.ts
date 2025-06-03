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
  Meld
} from '../types/mahjong';

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
  
  // Actions
  setGameState: (gameState: GameState) => void;
  setAnalysisResult: (result: AnalysisResult) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setAvailableTiles: (tiles: TileInfo[]) => void;
  setConnectionStatus: (connected: boolean, id?: string) => void;
  
  // 游戏操作
  addTileToHand: (playerId: number, tile: Tile) => void;
  removeTileFromHand: (playerId: number, tile: Tile) => void;
  addDiscardedTile: (tile: Tile, playerId?: number) => void;
  addMeld: (playerId: number, meld: Meld) => void;
  addAction: (action: PlayerAction) => void;
  
  // 重置功能
  resetGame: () => void;
  clearAnalysis: () => void;
}

const initialGameState: GameState = {
  player_hands: {
    0: { tiles: [], melds: [] },
    1: { tiles: [], melds: [] },
    2: { tiles: [], melds: [] },
    3: { tiles: [], melds: [] }
  },
  discarded_tiles: [],
  player_discarded_tiles: {
    0: [],
    1: [],
    2: [],
    3: []
  },
  remaining_tiles: [],
  current_player: 0,
  actions_history: []
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
    
    clearAnalysis: () => set({ analysisResult: null })
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