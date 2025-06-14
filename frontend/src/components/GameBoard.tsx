import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWebSocketGameStore } from '../stores/webSocketGameStore';
import { Tile, TileType, createTile, tileToString, tilesEqual, Meld, MeldType, GangType, calculateRemainingTilesByType } from '../types/mahjong';
import MahjongTile from './MahjongTile';
import MahjongTable from './MahjongTable';
import { CardBackStyle } from './MahjongTile';
import MissingSuitControl from './MissingSuitControl';

interface GameBoardProps {
  className?: string;
  cardBackStyle?: CardBackStyle;
}

const GameBoard: React.FC<GameBoardProps> = ({ className, cardBackStyle = 'elegant' }) => {
  const { 
    gameState,
    isConnected,
    lastSyncTime,
    addTileToHand,
    discardTile,
    pengTile,
    gangTile,
    setMissingSuit,
    nextPlayer,
    resetGame,
    syncGameStateFromWS,
    // 本地操作方法（用于兼容）
    addTileToHandLocal,
    removeTileFromHand,
    addDiscardedTile,
    addMeld,
    reduceHandTilesCount,
    setPlayerMissingSuit
  } = useWebSocketGameStore();
  
  // 从游戏状态中获取我的手牌和弃牌
  const myHand = gameState.player_hands['0']?.tiles || [];
  const discardedTiles = gameState.discarded_tiles || [];
  
  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<number>(0); // 默认选择上家（显示索引0）
  const [operationType, setOperationType] = useState<'hand' | 'discard' | 'peng' | 'angang' | 'zhigang' | 'jiagang' | 'missing'>('hand');
  const [selectedSourcePlayer, setSelectedSourcePlayer] = useState<number | null>(null); // 新增：被杠玩家选择
  const [autoSync, setAutoSync] = useState(false);
  const autoSyncTimer = useRef<NodeJS.Timeout | null>(null);
  
  // 计算每种牌的剩余数量
  const remainingTilesByType = calculateRemainingTilesByType(gameState);
  
  // 调试信息：打印游戏状态和计算结果
  React.useEffect(() => {
    console.log('🎮 当前游戏状态:', gameState);
    console.log('📊 剩余牌数统计:', remainingTilesByType);
    
    // 打印每个玩家的详细信息
    Object.entries(gameState.player_hands).forEach(([playerId, hand]) => {
      const handTileCount = hand.tile_count !== undefined ? hand.tile_count : (hand.tiles?.length || 0);
      console.log(`玩家${playerId}:`, {
        手牌数量: handTileCount,
        碰杠数量: hand.melds.length,
        碰杠详情: hand.melds.map(meld => ({
          类型: meld.type,
          牌: meld.tiles.map(t => `${t.value}${t.type}`),
          数量: meld.tiles.length
        }))
      });
    });
  }, [gameState, remainingTilesByType]);
  
  // 自动同步副作用
  useEffect(() => {
    if (autoSync) {
      autoSyncTimer.current = setInterval(() => {
        syncGameStateFromWS();
      }, 500);
    } else if (autoSyncTimer.current) {
      clearInterval(autoSyncTimer.current);
      autoSyncTimer.current = null;
    }
    // 清理定时器
    return () => {
      if (autoSyncTimer.current) {
        clearInterval(autoSyncTimer.current);
        autoSyncTimer.current = null;
      }
    };
  }, [autoSync, syncGameStateFromWS]);
  
  // 所有可选的牌
  const availableTiles: Tile[] = [];
  
  // 万 1-9
  for (let i = 1; i <= 9; i++) {
    availableTiles.push(createTile(TileType.WAN, i));
  }
  
  // 条 1-9
  for (let i = 1; i <= 9; i++) {
    availableTiles.push(createTile(TileType.TIAO, i));
  }
  
  // 筒 1-9
  for (let i = 1; i <= 9; i++) {
    availableTiles.push(createTile(TileType.TONG, i));
  }

  // 用于界面显示的玩家顺序：上家、我、下家、对家
  const displayOrder = [3, 0, 1, 2]; // 对应Player ID：上家=3，我=0，下家=1，对家=2
  const playerNames = ['我', '下家', '对家', '上家']; // Player ID映射：0=我，1=下家，2=对家，3=上家
  const playerColors = ['text-blue-600', 'text-green-600', 'text-red-600', 'text-yellow-600'];
  const displayNames = displayOrder.map(id => playerNames[id]);
  const displayColors = displayOrder.map(id => playerColors[id]);

  const handleTileClick = async (tile: Tile) => {
    const actualPlayerId = displayOrder[selectedPlayer]; // 转换显示索引为实际Player ID
    
    try {
      if (operationType === 'hand') {
        // 为当前选中的玩家添加手牌 - 使用WebSocket方法
        await addTileToHand(actualPlayerId, tile);
        console.log(`✅ 玩家${actualPlayerId}添加手牌成功: ${tile.value}${tile.type}`);
      } else if (operationType === 'discard') {
        // 弃牌 - 使用WebSocket方法
        await discardTile(actualPlayerId, tile);
        console.log(`✅ 玩家${actualPlayerId}弃牌成功: ${tile.value}${tile.type}`);
      } else if (operationType === 'peng') {
        // 碰牌 - 使用WebSocket方法
        const sourcePlayerId = selectedSourcePlayer !== null ? displayOrder[selectedSourcePlayer] : undefined;
        await pengTile(actualPlayerId, tile, sourcePlayerId);
        console.log(`✅ 玩家${actualPlayerId}碰牌成功: ${tile.value}${tile.type}`);
      } else if (operationType === 'angang') {
        // 暗杠 - 使用WebSocket方法
        await gangTile(actualPlayerId, tile, 'angang');
        console.log(`✅ 玩家${actualPlayerId}暗杠成功: ${tile.value}${tile.type}`);
      } else if (operationType === 'zhigang') {
        // 直杠 - 使用WebSocket方法
        const sourcePlayerId = selectedSourcePlayer !== null ? displayOrder[selectedSourcePlayer] : undefined;
        await gangTile(actualPlayerId, tile, 'zhigang', sourcePlayerId);
        console.log(`✅ 玩家${actualPlayerId}直杠成功: ${tile.value}${tile.type}`);
      } else if (operationType === 'jiagang') {
        // 加杠 - 使用WebSocket方法
        await gangTile(actualPlayerId, tile, 'jiagang');
        console.log(`✅ 玩家${actualPlayerId}加杠成功: ${tile.value}${tile.type}`);
      } else if (operationType === 'missing') {
        // 定缺操作：只能设置万、条、筒
        if (['wan', 'tiao', 'tong'].includes(tile.type)) {
          await setMissingSuit(actualPlayerId, tile.type);
          console.log(`✅ 玩家${actualPlayerId}定缺设置成功: ${tile.type}`);
        } else {
          console.warn('❌ 定缺只能选择万、条、筒');
        }
      }
    } catch (error) {
      console.error('操作失败:', error);
    }
  };
  
  const handleHandTileClick = (tile: Tile) => {
    const isSelected = selectedTiles.some(t => tilesEqual(t, tile));
    
    if (isSelected) {
      setSelectedTiles(prev => prev.filter(t => !tilesEqual(t, tile)));
    } else {
      setSelectedTiles(prev => [...prev, tile]);
    }
  };
  
  const handleDiscardSelected = () => {
    selectedTiles.forEach(tile => {
      removeTileFromHand(0, tile);
      addDiscardedTile(tile, 0);
    });
    setSelectedTiles([]);
  };
  
  const handleClearHand = async () => {
    try {
      await resetGame();
      setSelectedTiles([]);
      console.log('✅ 游戏重置成功');
    } catch (error) {
      console.error('❌ 重置游戏失败:', error);
    }
  };

  // 处理操作类型改变
  const handleOperationTypeChange = (newOperationType: 'hand' | 'discard' | 'peng' | 'angang' | 'zhigang' | 'jiagang' | 'missing') => {
    setOperationType(newOperationType);
    // 如果不是直杠或碰牌操作，清除被杠/被碰玩家的选择
    if (newOperationType !== 'zhigang' && newOperationType !== 'peng') {
      setSelectedSourcePlayer(null);
    }
  };



  // 获取可选择的被杠玩家（排除当前杠牌的玩家）
  const getAvailableSourcePlayers = () => {
    return displayNames
      .map((name, index) => ({ name, index }))
      .filter(player => player.index !== selectedPlayer);
  };

  // 获取操作类型的中文名称
  const getOperationName = (type: 'hand' | 'discard' | 'peng' | 'angang' | 'zhigang' | 'jiagang' | 'missing'): string => {
          const operationMap = {
        'hand': '添加手牌',
        'discard': '弃牌',
        'peng': '碰牌',
        'angang': '暗杠',
        'zhigang': '直杠',
        'jiagang': '加杠',
        'missing': '定缺'
      };
    return operationMap[type] || type;
  };

  // 获取指定牌的剩余数量
  const getTileRemainingCount = (tile: Tile): number => {
    const key = `${tile.type}-${tile.value}`;
    return remainingTilesByType[key] || 0;
  };

  return (
    <div className={`bg-green-100 rounded-lg p-3 h-full flex flex-col ${className}`}>
      {/* 麻将桌布局 - 与选择麻将牌区域相同的宽度 */}
      <div className="bg-white rounded-lg p-3 border border-gray-300 mb-3">
        <MahjongTable cardBackStyle={cardBackStyle} />
      </div>


      

      
      {/* 操作控制区域 */}
      <div className="mb-3 flex-shrink-0">
        <div className="flex flex-col gap-3">
          
          {/* 第一行：当前玩家、选择玩家和选择操作 */}
          <div className="flex items-center gap-6 flex-wrap">
            {/* 当前玩家指示器和控制 */}
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-orange-700 min-w-max">
                🎯 当前玩家:
              </span>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-md text-sm font-bold bg-orange-100 text-orange-800 current-player-indicator`}>
                  {playerNames[gameState.current_player || 0]}
                </span>
                <button
                  onClick={async () => {
                    try {
                      await nextPlayer();
                      console.log('✅ 切换到下一个玩家');
                    } catch (error) {
                      console.error('❌ 切换玩家失败:', error);
                    }
                  }}
                  className="px-2 py-1 bg-orange-200 hover:bg-orange-300 text-orange-800 rounded-md text-xs font-medium transition-colors"
                  title="切换到下一个玩家"
                >
                  下一个
                </button>
              </div>
            </div>

            {/* 第一步：选择玩家 */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 min-w-max">
                1 选择玩家:
              </span>
              <div className="flex gap-1">
                {displayNames.map((name, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPlayer(index)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedPlayer === index
                        ? `bg-opacity-20 ${displayColors[index].replace('text-', 'bg-').replace('-600', '-200')} ${displayColors[index]} border-2 border-current`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* 第二步：选择操作类型 */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 min-w-max">
                2 选择操作:
              </span>
              <div className="flex bg-gray-200 rounded-lg p-1">
                <button
                  onClick={() => handleOperationTypeChange('hand')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    operationType === 'hand'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  添加手牌
                </button>
                <button
                  onClick={() => handleOperationTypeChange('discard')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    operationType === 'discard'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  弃牌
                </button>
                <button
                  onClick={() => handleOperationTypeChange('peng')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    operationType === 'peng'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  碰牌
                </button>
                <button
                  onClick={() => handleOperationTypeChange('angang')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    operationType === 'angang'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  暗杠
                </button>
                <button
                  onClick={() => handleOperationTypeChange('zhigang')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    operationType === 'zhigang'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  直杠
                </button>
                <button
                  onClick={() => handleOperationTypeChange('jiagang')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    operationType === 'jiagang'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  加杠
                </button>
                <button
                  onClick={() => handleOperationTypeChange('missing')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    operationType === 'missing'
                      ? 'bg-white text-yellow-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  定缺
                </button>
              </div>
            </div>
          </div>

          {/* 2.1 选择被杠玩家/被碰玩家 - 只有选择直杠或碰牌时显示 */}
          {(operationType === 'zhigang' || operationType === 'peng') && (
            <div className="flex items-center gap-3 pl-6 border-l-2 border-blue-200">
              <span className="text-sm font-medium text-gray-700 min-w-max">
                2.1 选择被{operationType === 'zhigang' ? '杠' : '碰'}玩家:
              </span>
              <div className="flex gap-1">
                {getAvailableSourcePlayers().map(({ name, index }) => (
                  <button
                    key={index}
                    onClick={() => setSelectedSourcePlayer(index)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedSourcePlayer === index
                        ? `bg-opacity-20 ${displayColors[index].replace('text-', 'bg-').replace('-600', '-200')} ${displayColors[index]} border-2 border-current`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 麻将牌选择区 - 可滚动，占用剩余空间 */}
      <div className="bg-white rounded-lg p-3 border border-gray-300 flex-1 overflow-y-auto">
        <div className="flex items-center gap-4 mb-3">
          <h3 className="text-base font-semibold text-gray-700">
            3 选择麻将牌
          </h3>
          
          {/* 当前操作状态提示 */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-blue-700">
              当前操作: 为 <span className="font-medium">{displayNames[selectedPlayer]}</span> {getOperationName(operationType)}
              {(operationType === 'zhigang' || operationType === 'peng') && selectedSourcePlayer !== null && (
                <span> (从 <span className="font-medium">{displayNames[selectedSourcePlayer]}</span>)</span>
              )}
            </span>
          </div>
        </div>
        
        {/* 所有麻将牌一列显示 */}
        <div>
          {operationType === 'missing' && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-700">
                <strong>定缺操作:</strong> 请点击任意一张万、条或筒的牌来设置该玩家的定缺花色
              </p>
            </div>
          )}
          
          <div className="flex gap-0.5 flex-wrap">
            {availableTiles
              .filter(tile => {
                // 定缺操作时只显示万、条、筒各一张，其他操作按原逻辑
                if (operationType === 'missing') {
                  // 只显示每种花色的第一张牌（用于选择花色）
                  return tile.value === 1;
                }
                
                // 只显示剩余数量大于0的牌
                const remainingCount = getTileRemainingCount(tile);
                return remainingCount > 0;
              })
              .map((tile, index) => {
                const remainingCount = operationType === 'missing' ? undefined : getTileRemainingCount(tile);
                return (
                  <MahjongTile
                    key={`tile-${tile.type}-${tile.value}`}
                    tile={tile}
                    size="small"
                    variant="default"
                    onClick={() => handleTileClick(tile)}
                    animationDelay={index * 0.02}
                    cardBackStyle={cardBackStyle}
                    remainingCount={remainingCount}
                  />
                );
              })}
          </div>
        </div>
      </div>

            {/* API同步控制区域 */}
            <div className="mb-3 flex-shrink-0">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-semibold text-gray-700">WebSocket连接状态</h3>
              <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
                isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                {isConnected ? 'WebSocket已连接' : 'WebSocket未连接'}
              </div>
              {lastSyncTime && (
                <span className="text-xs text-gray-500">
                  最后更新: {lastSyncTime.toLocaleTimeString()}
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={syncGameStateFromWS}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                🔄 同步游戏状态
              </button>
              <button
                onClick={() => setAutoSync(prev => !prev)}
                className={`px-3 py-1.5 text-xs font-medium ${autoSync ? 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' : 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100'} rounded-md border transition-colors`}
              >
                {autoSync ? '停止自动同步' : '启用自动同步'}
              </button>
            </div>
          </div>
        </div>
      </div>

            {/* 定缺控制区域 */}
      <div className="mb-3">
        <MissingSuitControl />
      </div>
    </div>
  );
};

export default GameBoard; 