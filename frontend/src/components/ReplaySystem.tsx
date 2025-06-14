import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocketGameStore } from '../stores/webSocketGameStore';
import { Tile, GameState, createTile, MeldType, GangType, TileType } from '../types/mahjong';
import MahjongTable from './MahjongTable';
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
            const index = tiles.findIndex(t => t.type === actionTile.type && t.value === actionTile.value);
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
              const index = tiles.findIndex(t => t.type === actionTile.type && t.value === actionTile.value);
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
              const index = tiles.findIndex(t => t.type === actionTile.type && t.value === actionTile.value);
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

    // 更新当前玩家（简单轮转）
    newState.current_player = (action.player_id + 1) % 4;

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
        <div className="max-w-7xl mx-auto">
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
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                重置
              </button>
              <button
                onClick={handleStepBackward}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={currentStep <= -1}
              >
                ⏮️ 上一步
              </button>
              <button
                onClick={handlePlayPause}
                className={classNames('px-4 py-2 text-white rounded', {
                  'bg-green-500 hover:bg-green-600': !isPlaying,
                  'bg-red-500 hover:bg-red-600': isPlaying
                })}
              >
                {isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
              </button>
              <button
                onClick={handleStepForward}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={currentStep >= replayData.actions.length - 1}
              >
                下一步 ⏭️
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                步骤 {Math.max(0, currentStep + 1)} / {replayData.actions.length}
              </div>
              
              <select
                value={playSpeed}
                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={2000}>0.5x</option>
                <option value={1000}>1x</option>
                <option value={500}>2x</option>
                <option value={250}>4x</option>
              </select>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((currentStep + 1) / replayData.actions.length) * 100}%` 
                }}
              />
            </div>
            <input
              type="range"
              min="-1"
              max={replayData.actions.length - 1}
              value={currentStep}
              onChange={(e) => setCurrentStep(Number(e.target.value))}
              className="w-full mt-1 opacity-70 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 麻将桌面 - 占3列 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-4">
              <MahjongTable cardBackStyle="elegant" />
            </div>
            
            {/* 当前操作显示 */}
            {currentAction && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="text-lg font-medium text-blue-800">
                  {getActionDescription(currentAction, replayData.players[currentAction.player_id]?.name || `玩家${currentAction.player_id + 1}`)}
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  {new Date(currentAction.timestamp).toLocaleTimeString()}
                  {currentAction.score_change !== 0 && (
                    <span className={classNames('ml-2', {
                      'text-green-600': currentAction.score_change > 0,
                      'text-red-600': currentAction.score_change < 0
                    })}>
                      ({currentAction.score_change > 0 ? '+' : ''}{currentAction.score_change}分)
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* 侧边栏 - 占1列 */}
          <div className="space-y-6">
            {/* 玩家信息 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-800 mb-3">玩家信息</h3>
              <div className="space-y-3">
                {replayData.players.map((player) => (
                  <motion.div
                    key={player.id}
                    className={classNames('p-3 rounded border-2 transition-all', {
                      'border-green-500 bg-green-50': player.is_winner,
                      'border-gray-300 bg-gray-50': !player.is_winner,
                      'ring-2 ring-blue-500': currentAction?.player_id === player.position
                    })}
                    animate={{
                      scale: currentAction?.player_id === player.position ? 1.02 : 1
                    }}
                  >
                    <div className="font-medium">{player.name}</div>
                    <div className="text-sm text-gray-600">座位 {player.position + 1}</div>
                    <div className="text-sm text-gray-600">
                      定缺: {player.missing_suit ? `${player.missing_suit === 'wan' ? '万' : player.missing_suit === 'tiao' ? '条' : '筒'}` : '未定'}
                    </div>
                    <div className="text-sm">
                      得分: 
                      <span className={classNames('ml-1 font-medium', {
                        'text-green-600': player.final_score > 0,
                        'text-red-600': player.final_score < 0,
                        'text-gray-600': player.final_score === 0
                      })}>
                        {player.final_score}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 操作历史 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-800 mb-3">操作历史</h3>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {actionHistory.slice(-10).map((action, index) => (
                  <div
                    key={index}
                    className={classNames('text-sm p-2 rounded', {
                      'bg-blue-100 text-blue-800': index === actionHistory.length - 1,
                      'text-gray-600': index !== actionHistory.length - 1
                    })}
                  >
                    {action}
                  </div>
                ))}
                {actionHistory.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-4">
                    暂无操作记录
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