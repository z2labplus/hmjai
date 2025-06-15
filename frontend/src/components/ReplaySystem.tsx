import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocketGameStore } from '../stores/webSocketGameStore';
import { Tile, GameState, createTile, MeldType, GangType, TileType } from '../types/mahjong';
import MahjongTable from './MahjongTable';
import MahjongTile from './MahjongTile';
import ReplayImporter from './ReplayImporter';
import classNames from 'classnames';

interface ReplayAction {
  sequence: number;
  timestamp: string;
  player_id: number;
  action_type: string;
  card?: string;
  target_player?: number;
  gang_type?: string;
  missing_suit?: string;
  score_change: number;
}

interface ReplayData {
  game_info: {
    game_id: string;
    start_time: string;
    end_time?: string;
    duration?: number;
    player_count: number;
    game_mode: string;
  };
  players: Array<{
    id: number;
    name: string;
    position: number;
    initial_hand: string[];
    missing_suit?: string;
    final_score: number;
    is_winner: boolean;
    statistics: {
      draw_count: number;
      discard_count: number;
      peng_count: number;
      gang_count: number;
    };
  }>;
  actions: ReplayAction[];
  metadata: any;
}

const ReplaySystem: React.FC = () => {
  const { setGameState, gameState } = useWebSocketGameStore();
  
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const [currentStep, setCurrentStep] = useState(-1); // -1 表示初始状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000);
  const [showImporter, setShowImporter] = useState(true);
  const [actionHistory, setActionHistory] = useState<string[]>([]);

  // 生成所有麻将牌用于显示
  const allMahjongTiles = useMemo(() => {
    const tiles: Tile[] = [];
    // 万、条、筒，每种花色1-9各4张
    [TileType.WAN, TileType.TIAO, TileType.TONG].forEach(suit => {
      for (let value = 1; value <= 9; value++) {
        for (let count = 0; count < 4; count++) {
          tiles.push(createTile(suit, value));
        }
      }
    });
    return tiles;
  }, []);

  // 获取牌的剩余数量（用于显示）
  const getTileRemainingCount = useCallback((tile: Tile): number => {
    if (!gameState) return 4;
    
    let usedCount = 0;
    
    // 统计所有玩家手牌中的使用数量
    Object.values(gameState.player_hands).forEach(hand => {
      if (hand.tiles) {
        usedCount += hand.tiles.filter(t => 
          t.type === tile.type && t.value === tile.value
        ).length;
      }
      
      // 统计明牌中的使用数量
      hand.melds.forEach(meld => {
        usedCount += meld.tiles.filter(t => 
          t.type === tile.type && t.value === tile.value
        ).length;
      });
    });
    
    // 统计弃牌中的使用数量
    if (gameState.discarded_tiles) {
      usedCount += gameState.discarded_tiles.filter(t => 
        t.type === tile.type && t.value === tile.value
      ).length;
    }
    
    return Math.max(0, 4 - usedCount);
  }, [gameState]);

  // 获取去重的麻将牌（用于显示）
  const uniqueTiles = useMemo(() => {
    const seen = new Set<string>();
    return allMahjongTiles.filter(tile => {
      const key = `${tile.type}-${tile.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allMahjongTiles]);

  // 解析牌的字符串格式 (如 "1万", "5条")
  const parseCardString = useCallback((cardStr: string): Tile | null => {
    if (!cardStr || cardStr.length < 2) return null;
    
    const value = parseInt(cardStr[0]);
    const suitChar = cardStr.slice(1);
    
    let suit: TileType;
    switch (suitChar) {
      case '万': suit = TileType.WAN; break;
      case '条': suit = TileType.TIAO; break;
      case '筒': suit = TileType.TONG; break;
      default: return null;
    }
    
    if (value >= 1 && value <= 9) {
      return createTile(suit, value);
    }
    
    return null;
  }, []);

  // 构建初始游戏状态
  const buildInitialGameState = useCallback((data: ReplayData): GameState => {
    const newGameState: GameState = {
      game_id: data.game_info.game_id,
      player_hands: {},
      player_discarded_tiles: { '0': [], '1': [], '2': [], '3': [] },
      discarded_tiles: [],
      actions_history: [],
      current_player: 0,
      game_started: true
    };

    // 初始化玩家手牌
    data.players.forEach((player) => {
      const playerId = player.position.toString();
      const initialTiles = player.initial_hand
        .map(cardStr => parseCardString(cardStr))
        .filter(tile => tile !== null) as Tile[];

      newGameState.player_hands[playerId] = {
        tiles: player.position === 0 ? initialTiles : null, // 只显示自己的手牌
        tile_count: initialTiles.length,
        melds: [],
        missing_suit: player.missing_suit || null
      };
    });

    return newGameState;
  }, [parseCardString]);

  // 应用单个操作到游戏状态
  const applyAction = useCallback((state: GameState, action: ReplayAction): GameState => {
    const newState = JSON.parse(JSON.stringify(state)); // 深拷贝
    const playerIdStr = action.player_id.toString();
    
    // 解析操作中的牌
    const actionTile = action.card ? parseCardString(action.card) : null;
    
    switch (action.action_type) {
      case 'draw':
        // 摸牌
        if (actionTile) {
          if (action.player_id === 0) {
            // 玩家0的手牌可见
            newState.player_hands[playerIdStr].tiles?.push(actionTile);
          } else {
            // 其他玩家只增加牌数
            newState.player_hands[playerIdStr].tile_count += 1;
          }
        }
        break;

      case 'discard':
        // 弃牌
        if (actionTile) {
          // 添加到弃牌区
          newState.player_discarded_tiles[playerIdStr].push(actionTile);
          newState.discarded_tiles.push(actionTile);
          
          // 从手牌移除
          if (action.player_id === 0 && newState.player_hands[playerIdStr].tiles) {
            const tiles = newState.player_hands[playerIdStr].tiles!;
            const index = tiles.findIndex((t: Tile) => t.type === actionTile.type && t.value === actionTile.value);
            if (index !== -1) {
              tiles.splice(index, 1);
            }
          } else {
            newState.player_hands[playerIdStr].tile_count -= 1;
          }
        }
        break;

      case 'peng':
        // 碰牌
        if (actionTile) {
          const meld = {
            type: MeldType.PENG,
            tiles: [actionTile, actionTile, actionTile],
            exposed: true,
            source_player: action.target_player
          };
          newState.player_hands[playerIdStr].melds.push(meld);
          
          // 减少手牌数量
          if (action.player_id === 0) {
            // 玩家0减少2张（第3张是碰来的）
            const tiles = newState.player_hands[playerIdStr].tiles!;
            for (let i = 0; i < 2; i++) {
              const index = tiles.findIndex((t: Tile) => t.type === actionTile.type && t.value === actionTile.value);
              if (index !== -1) tiles.splice(index, 1);
            }
          } else {
            newState.player_hands[playerIdStr].tile_count -= 2;
          }
        }
        break;

      case 'gang':
        // 杠牌
        if (actionTile) {
          const meld = {
            type: MeldType.GANG,
            tiles: [actionTile, actionTile, actionTile, actionTile],
            exposed: action.gang_type !== 'an_gang',
            gang_type: action.gang_type === 'an_gang' ? GangType.AN_GANG : 
                       action.gang_type === 'jia_gang' ? GangType.JIA_GANG : GangType.MING_GANG,
            source_player: action.target_player
          };
          newState.player_hands[playerIdStr].melds.push(meld);
          
          // 减少手牌数量
          const reduceCount = action.gang_type === 'an_gang' ? 4 : 
                            action.gang_type === 'jia_gang' ? 1 : 3;
          
          if (action.player_id === 0) {
            const tiles = newState.player_hands[playerIdStr].tiles!;
            for (let i = 0; i < reduceCount; i++) {
              const index = tiles.findIndex((t: Tile) => t.type === actionTile.type && t.value === actionTile.value);
              if (index !== -1) tiles.splice(index, 1);
            }
          } else {
            newState.player_hands[playerIdStr].tile_count -= reduceCount;
          }
        }
        break;

      case 'missing_suit':
        // 定缺
        if (action.missing_suit) {
          newState.player_hands[playerIdStr].missing_suit = action.missing_suit;
        }
        break;

      case 'hu':
        // 胡牌
        newState.player_hands[playerIdStr].is_winner = true;
        newState.player_hands[playerIdStr].win_type = 'zimo'; // 简化处理
        if (actionTile) {
          newState.player_hands[playerIdStr].win_tile = actionTile;
        }
        break;
    }

    // 当前玩家就是执行操作的玩家
    newState.current_player = action.player_id;

    return newState;
  }, [parseCardString]);

  // 计算指定步骤的游戏状态
  const getStateAtStep = useMemo(() => {
    if (!replayData) return null;
    
    let state = buildInitialGameState(replayData);
    
    // 应用到当前步骤为止的所有操作
    for (let i = 0; i <= currentStep; i++) {
      if (i < replayData.actions.length) {
        state = applyAction(state, replayData.actions[i]);
      }
    }
    
    return state;
  }, [replayData, currentStep, buildInitialGameState, applyAction]);

  // 更新游戏状态
  useEffect(() => {
    const state = getStateAtStep;
    if (state) {
      setGameState(state);
    }
  }, [getStateAtStep, setGameState]);

  // 自动播放控制
  useEffect(() => {
    if (!isPlaying || !replayData) return;

    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= replayData.actions.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, playSpeed, replayData]);

  // 更新操作历史
  useEffect(() => {
    if (!replayData) return;
    
    const history = [];
    for (let i = 0; i <= currentStep; i++) {
      if (i < replayData.actions.length) {
        const action = replayData.actions[i];
        const playerName = replayData.players[action.player_id]?.name || `玩家${action.player_id + 1}`;
        history.push(getActionDescription(action, playerName));
      }
    }
    setActionHistory(history);
  }, [replayData, currentStep]);

  const getActionDescription = (action: ReplayAction, playerName: string): string => {
    switch (action.action_type) {
      case 'draw': return `${playerName} 摸牌`;
      case 'discard': return `${playerName} 弃牌 ${action.card}`;
      case 'peng': return `${playerName} 碰牌 ${action.card}`;
      case 'gang': 
        const gangTypeMap = {
          'an_gang': '暗杠',
          'ming_gang': '明杠', 
          'jia_gang': '加杠'
        };
        return `${playerName} ${gangTypeMap[action.gang_type as keyof typeof gangTypeMap] || '杠'} ${action.card}`;
      case 'hu': return `🎉 ${playerName} 胡牌！`;
      case 'missing_suit': 
        const suitMap = { 'wan': '万', 'tiao': '条', 'tong': '筒' };
        return `${playerName} 定缺${suitMap[action.missing_suit as keyof typeof suitMap]}`;
      default: return `${playerName} ${action.action_type}`;
    }
  };

  const handleImportReplay = useCallback((data: ReplayData) => {
    setReplayData(data);
    setCurrentStep(-1);
    setIsPlaying(false);
    setShowImporter(false);
    setActionHistory([]);
    
    // 设置初始状态
    const initialState = buildInitialGameState(data);
    setGameState(initialState);
  }, [buildInitialGameState, setGameState]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleStepForward = useCallback(() => {
    if (!replayData) return;
    setCurrentStep(prev => Math.min(prev + 1, replayData.actions.length - 1));
  }, [replayData]);

  const handleStepBackward = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, -1));
  }, []);

  const handleReset = useCallback(() => {
    setCurrentStep(-1);
    setIsPlaying(false);
  }, []);

  const handleClose = useCallback(() => {
    setReplayData(null);
    setShowImporter(true);
    setCurrentStep(-1);
    setIsPlaying(false);
    setActionHistory([]);
  }, []);

  if (showImporter || !replayData) {
    return (
      <div className="replay-system p-6 bg-white rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">🎬 牌谱回放系统</h2>
          {replayData && (
            <button
              onClick={() => setShowImporter(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              返回回放
            </button>
          )}
        </div>
        <ReplayImporter onImport={handleImportReplay} />
      </div>
    );
  }

  const currentAction = currentStep >= 0 ? replayData.actions[currentStep] : null;

  return (
    <div className="replay-system min-h-screen bg-gray-50">
      {/* 头部控制区 */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="w-full mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                🎬 {replayData.game_info.game_id}
              </h2>
              <p className="text-sm text-gray-600">
                {new Date(replayData.game_info.start_time).toLocaleString()}
                {replayData.game_info.duration && ` · ${Math.floor(replayData.game_info.duration / 60)}分钟`}
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowImporter(true)}
                className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
              >
                导入其他牌谱
              </button>
              <button
                onClick={handleClose}
                className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                关闭回放
              </button>
            </div>
          </div>

          {/* 播放控制 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleReset}
                className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium"
              >
                🔄 重置
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStepBackward}
                disabled={currentStep <= -1}
                className={classNames(
                  'px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium',
                  currentStep <= -1
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                )}
              >
                ⏮️ 上一步
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePlayPause}
                className={classNames(
                  'px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium text-white',
                  isPlaying
                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                    : 'bg-gradient-to-r from-green-500 to-green-600'
                )}
              >
                {isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStepForward}
                disabled={currentStep >= replayData.actions.length - 1}
                className={classNames(
                  'px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium',
                  currentStep >= replayData.actions.length - 1
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                )}
              >
                下一步 ⏭️
              </motion.button>
            </div>

            <div className="flex items-center gap-4">
              <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                步骤 {Math.max(0, currentStep + 1)} / {replayData.actions.length}
              </div>
              
              <select
                value={playSpeed}
                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value={2000}>🐌 0.5x</option>
                <option value={1000}>🚶 1x</option>
                <option value={500}>🏃 2x</option>
                <option value={250}>🚀 4x</option>
              </select>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mt-4">
            <div className="relative w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-3 shadow-inner">
              <motion.div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full shadow-lg"
                style={{ 
                  width: `${((currentStep + 1) / replayData.actions.length) * 100}%` 
                }}
                animate={{
                  width: `${((currentStep + 1) / replayData.actions.length) * 100}%`
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <div className="h-full w-full bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
              </motion.div>
              
              {/* 进度条上的时间标记点 */}
              {replayData.actions.length > 0 && (
                <div className="absolute top-0 left-0 w-full h-full">
                  {[0, 0.25, 0.5, 0.75, 1].map((pos, index) => (
                    <div
                      key={index}
                      className="absolute top-0 w-0.5 h-3 bg-white/50 rounded-full"
                      style={{ left: `${pos * 100}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
            
            <input
              type="range"
              min="-1"
              max={replayData.actions.length - 1}
              value={currentStep}
              onChange={(e) => setCurrentStep(Number(e.target.value))}
              className="w-full mt-2 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((currentStep + 1) / replayData.actions.length) * 100}%, #e5e7eb ${((currentStep + 1) / replayData.actions.length) * 100}%, #e5e7eb 100%)`
              }}
            />
          </div>
          
        </div>
      </div>

      {/* 主内容区 */}
      <div className="w-full mx-auto p-4">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* 麻将桌面 - 占3列 */}
          <div className="xl:col-span-3 space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <MahjongTable cardBackStyle="elegant" />
            </div>
            
            {/* 当前操作显示 */}
            {currentAction && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm"
              >
                <div className="text-lg font-medium text-blue-800">
                  {getActionDescription(currentAction, replayData.players[currentAction.player_id]?.name || `玩家${currentAction.player_id + 1}`)}
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  {new Date(currentAction.timestamp).toLocaleTimeString()}
                  {currentAction.score_change !== 0 && (
                    <span className={classNames('ml-2 px-2 py-1 rounded-full text-xs font-medium', {
                      'bg-green-100 text-green-700': currentAction.score_change > 0,
                      'bg-red-100 text-red-700': currentAction.score_change < 0
                    })}>
                      {currentAction.score_change > 0 ? '+' : ''}{currentAction.score_change}分
                    </span>
                  )}
                </div>
              </motion.div>
            )}
            
            {/* 所有麻将牌显示区域 */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-base font-semibold text-gray-800">🀄 所有麻将牌</div>
                <div className="text-xs text-gray-500">剩余数量实时显示</div>
              </div>
              
              <div className="space-y-2">
                {/* 万子 */}
                <div>
                  <div className="text-xs font-medium text-red-600 mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    万子
                  </div>
                  <div className="flex gap-0.5 flex-wrap">
                    {uniqueTiles
                      .filter(tile => tile.type === TileType.WAN)
                      .map((tile, index) => {
                        const remainingCount = getTileRemainingCount(tile);
                        return (
                          <div key={`wan-${tile.value}`} className="relative">
                            <MahjongTile
                              tile={tile}
                              size="tiny"
                              variant="default"
                              cardBackStyle="elegant"
                              remainingCount={remainingCount}
                              animationDelay={index * 0.01}
                            />
                          </div>
                        );
                      })}
                  </div>
                </div>
                
                {/* 条子 */}
                <div>
                  <div className="text-xs font-medium text-green-600 mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    条子
                  </div>
                  <div className="flex gap-0.5 flex-wrap">
                    {uniqueTiles
                      .filter(tile => tile.type === TileType.TIAO)
                      .map((tile, index) => {
                        const remainingCount = getTileRemainingCount(tile);
                        return (
                          <div key={`tiao-${tile.value}`} className="relative">
                            <MahjongTile
                              tile={tile}
                              size="tiny"
                              variant="default"
                              cardBackStyle="elegant"
                              remainingCount={remainingCount}
                              animationDelay={index * 0.01}
                            />
                          </div>
                        );
                      })}
                  </div>
                </div>
                
                {/* 筒子 */}
                <div>
                  <div className="text-xs font-medium text-blue-600 mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    筒子
                  </div>
                  <div className="flex gap-0.5 flex-wrap">
                    {uniqueTiles
                      .filter(tile => tile.type === TileType.TONG)
                      .map((tile, index) => {
                        const remainingCount = getTileRemainingCount(tile);
                        return (
                          <div key={`tong-${tile.value}`} className="relative">
                            <MahjongTile
                              tile={tile}
                              size="tiny"
                              variant="default"
                              cardBackStyle="elegant"
                              remainingCount={remainingCount}
                              animationDelay={index * 0.01}
                            />
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 侧边栏 - 占1列 */}
          <div className="space-y-6">
            {/* 玩家信息 */}
            <div className="bg-white rounded-lg shadow-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-base font-semibold text-gray-800">👥 玩家信息</h3>
                {currentAction && (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="w-2 h-2 bg-orange-500 rounded-full"
                  />
                )}
              </div>
              <div className="space-y-3">
                {replayData.players.map((player) => {
                  const isCurrentPlayer = currentAction?.player_id === player.position;
                  const playerIcons = ['🧑', '👨', '👩', '🧓'];
                  return (
                    <motion.div
                      key={player.id}
                      className={classNames(
                        'p-3 rounded-lg border-2 transition-all duration-300 relative overflow-hidden',
                        {
                          'border-green-400 bg-gradient-to-br from-green-50 to-green-100 shadow-md': player.is_winner,
                          'border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100': !player.is_winner && !isCurrentPlayer,
                          'border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg ring-2 ring-orange-200': isCurrentPlayer
                        }
                      )}
                      animate={{
                        scale: isCurrentPlayer ? 1.02 : 1,
                        y: isCurrentPlayer ? -2 : 0
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* 当前玩家指示器 */}
                      {isCurrentPlayer && (
                        <motion.div
                          className="absolute top-2 right-2"
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            ⚡
                          </div>
                        </motion.div>
                      )}
                      
                      {/* 胜利者皇冠 */}
                      {player.is_winner && (
                        <motion.div
                          className="absolute top-2 right-2"
                          animate={{ y: [-2, 2, -2] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <div className="text-xl">👑</div>
                        </motion.div>
                      )}
                      
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-lg">{playerIcons[player.position]}</div>
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{player.name}</div>
                          <div className="text-xs text-gray-500">座位 {player.position + 1}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">定缺:</span>
                          <span className={classNames('px-2 py-1 rounded-full text-xs font-medium', {
                            'bg-red-100 text-red-700': player.missing_suit === 'wan',
                            'bg-green-100 text-green-700': player.missing_suit === 'tiao',
                            'bg-blue-100 text-blue-700': player.missing_suit === 'tong',
                            'bg-gray-100 text-gray-500': !player.missing_suit
                          })}>
                            {player.missing_suit ? 
                              `${player.missing_suit === 'wan' ? '万' : player.missing_suit === 'tiao' ? '条' : '筒'}` : 
                              '未定'
                            }
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">得分:</span>
                          <span className={classNames('px-2 py-1 rounded-full text-xs font-bold', {
                            'bg-green-100 text-green-700': player.final_score > 0,
                            'bg-red-100 text-red-700': player.final_score < 0,
                            'bg-gray-100 text-gray-600': player.final_score === 0
                          })}>
                            {player.final_score > 0 ? '+' : ''}{player.final_score}
                          </span>
                        </div>
                        
                        {/* 统计信息 */}
                        <div className="grid grid-cols-4 gap-1 pt-2 border-t border-gray-200">
                          <div className="text-center">
                            <div className="text-xs text-gray-500">摸</div>
                            <div className="text-sm font-medium">{player.statistics.draw_count}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500">弃</div>
                            <div className="text-sm font-medium">{player.statistics.discard_count}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500">碰</div>
                            <div className="text-sm font-medium text-orange-600">{player.statistics.peng_count}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500">杠</div>
                            <div className="text-sm font-medium text-purple-600">{player.statistics.gang_count}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* 操作历史 */}
            <div className="bg-white rounded-lg shadow-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-base font-semibold text-gray-800">📜 操作历史</h3>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {actionHistory.length} 条记录
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
                {actionHistory.slice(-15).map((action, index) => {
                  const isLatest = index === actionHistory.length - 1;
                  const actionIcons = {
                    '摸牌': '🀄',
                    '弃牌': '🗑️',
                    '碰牌': '💥',
                    '杠': '⚡',
                    '胡牌': '🎉',
                    '定缺': '🎯'
                  };
                  
                  // 提取操作类型
                  const actionType = Object.keys(actionIcons).find(type => action.includes(type));
                  const icon = actionType ? actionIcons[actionType as keyof typeof actionIcons] : '🎮';
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={classNames(
                        'text-xs p-2 rounded-md border-l-3 transition-all duration-200',
                        {
                          'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 text-blue-800 shadow-md': isLatest,
                          'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100': !isLatest
                        }
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{icon}</span>
                        <span className={classNames('flex-1 text-xs', {
                          'font-medium': isLatest
                        })}>
                          {action}
                        </span>
                        {isLatest && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="w-2 h-2 bg-blue-500 rounded-full"
                          />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                
                {actionHistory.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📝</div>
                    <div className="text-sm text-gray-500">暂无操作记录</div>
                    <div className="text-xs text-gray-400 mt-1">操作将在这里显示</div>
                  </div>
                )}
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplaySystem;