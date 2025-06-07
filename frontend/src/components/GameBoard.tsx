import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameStore, selectMyHand, selectDiscardedTiles } from '../stores/gameStore';
import { Tile, TileType, createTile, tileToString, tilesEqual, Meld, MeldType, GangType, calculateRemainingTilesByType } from '../types/mahjong';
import MahjongTile from './MahjongTile';
import MahjongTable from './MahjongTable';
import { CardBackStyle } from './MahjongTile';
import MahjongApiClient from '../services/MahjongApiClient';

interface GameBoardProps {
  className?: string;
  cardBackStyle?: CardBackStyle;
}

const GameBoard: React.FC<GameBoardProps> = ({ className, cardBackStyle = 'elegant' }) => {
  const myHand = useGameStore(selectMyHand());
  const discardedTiles = useGameStore(selectDiscardedTiles());
  const gameState = useGameStore(state => state.gameState);
  const { 
    addTileToHand, 
    removeTileFromHand, 
    addDiscardedTile, 
    addMeld, 
    reduceHandTilesCount,
    syncFromBackend,
    syncToBackend,
    isApiConnected,
    lastSyncTime
  } = useGameStore();
  
  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<number>(0); // 默认选择上家（显示索引0）
  const [operationType, setOperationType] = useState<'hand' | 'discard' | 'peng' | 'angang' | 'zhigang' | 'jiagang'>('hand');
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
      console.log(`玩家${playerId}:`, {
        手牌数量: hand.tiles.length,
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
        syncFromBackend();
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
  }, [autoSync, syncFromBackend]);
  
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

  const handleTileClick = async (tile: Tile) => {
    const actualPlayerId = displayOrder[selectedPlayer]; // 转换显示索引为实际Player ID
    
    try {
    if (operationType === 'hand') {
      // 为当前选中的玩家添加手牌
        await MahjongApiClient.addTileToHand(actualPlayerId, tile);
    } else if (operationType === 'discard') {
        // 调用API添加弃牌
        const response = await MahjongApiClient.discardTile(actualPlayerId, tile.type, tile.value);
        if (response.success) {
          // API调用成功后，更新前端状态
      addDiscardedTile(tile, actualPlayerId);
          // 获取最新的游戏状态
          const gameState = await MahjongApiClient.getGameState();
          if (gameState.success) {
            useGameStore.setState({ gameState: gameState.data });
          }
        }
    } else if (operationType === 'peng') {
      // 碰牌：创建碰牌组并添加到melds
      const meld: Meld = {
        type: MeldType.PENG,
        tiles: [tile, tile, tile],
        exposed: true,
        source_player: selectedSourcePlayer !== null ? displayOrder[selectedSourcePlayer] : undefined
      };
      addMeld(actualPlayerId, meld);
      
      // 碰牌后自动减少手牌
      if (actualPlayerId === 0) {
        // "我" 碰牌：减少2张手牌（第3张是从别人那里碰来的，我知道自己的手牌）
        removeTileFromHand(actualPlayerId, tile);
        removeTileFromHand(actualPlayerId, tile);
      } else {
        // 其他玩家碰牌：直接减少3张手牌（模拟真实场景）
        reduceHandTilesCount(actualPlayerId, 3, tile);
      }       
    } else if (operationType === 'angang') {
      // 暗杠：创建暗杠组并添加到melds
      const meld: Meld = {
        type: MeldType.GANG,
        tiles: [tile, tile, tile, tile],
        exposed: false,
        gang_type: GangType.AN_GANG
      };
      addMeld(actualPlayerId, meld);
      
      // 暗杠后自动减少手牌
      if (actualPlayerId === 0) {
        // "我" 暗杠：减少4张手牌（我知道自己的手牌）
        removeTileFromHand(actualPlayerId, tile);
        removeTileFromHand(actualPlayerId, tile);
        removeTileFromHand(actualPlayerId, tile);
        removeTileFromHand(actualPlayerId, tile);
      } else {
        // 其他玩家暗杠：直接减少4张手牌（模拟真实场景）
        reduceHandTilesCount(actualPlayerId, 4, tile);
      }
    } else if (operationType === 'zhigang') {
      // 直杠：创建明杠组并添加到melds
      const meld: Meld = {
        type: MeldType.GANG,
        tiles: [tile, tile, tile, tile],
        exposed: true,
        gang_type: GangType.MING_GANG,
        source_player: selectedSourcePlayer !== null ? displayOrder[selectedSourcePlayer] : undefined
      };
      addMeld(actualPlayerId, meld);
      
      // 直杠后自动减少手牌
      if (actualPlayerId === 0) {
        // "我" 直杠：减少3张手牌（第4张是从别人那里杠来的，我知道自己的手牌）
        removeTileFromHand(actualPlayerId, tile);
        removeTileFromHand(actualPlayerId, tile);
        removeTileFromHand(actualPlayerId, tile);
      } else {
        // 其他玩家直杠：直接减少4张手牌（模拟真实场景）
        reduceHandTilesCount(actualPlayerId, 4, tile);
      }
    } else if (operationType === 'jiagang') {
      // 加杠：创建明杠组并添加到melds
      const meld: Meld = {
        type: MeldType.GANG,
        tiles: [tile, tile, tile, tile],
        exposed: true,
        gang_type: GangType.JIA_GANG  // 使用JIA_GANG类型
      };
      addMeld(actualPlayerId, meld);
      
      // 加杠后自动减少手牌
      if (actualPlayerId === 0) {
        // "我" 加杠：减少1张手牌（在已有碰牌基础上加杠，我知道自己的手牌）
        removeTileFromHand(actualPlayerId, tile);
      } else {
        // 其他玩家加杠：直接减少1张手牌（模拟真实场景）
        reduceHandTilesCount(actualPlayerId, 1, tile);
      }
      }
    } catch (error) {
      console.error('操作失败:', error);
      // 可以在这里添加错误提示
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
  
  const handleClearHand = () => {
    useGameStore.getState().resetGame();
    setSelectedTiles([]);
  };

  // 处理操作类型改变
  const handleOperationTypeChange = (newOperationType: 'hand' | 'discard' | 'peng' | 'angang' | 'zhigang' | 'jiagang') => {
    setOperationType(newOperationType);
    // 如果不是直杠或碰牌操作，清除被杠/被碰玩家的选择
    if (newOperationType !== 'zhigang' && newOperationType !== 'peng') {
      setSelectedSourcePlayer(null);
    }
  };

  const playerNames = ['我', '下家', '对家', '上家']; // Player ID映射：0=我，1=下家，2=对家，3=上家
  const playerColors = ['text-blue-600', 'text-green-600', 'text-red-600', 'text-yellow-600'];
  
  // 用于界面显示的玩家顺序：上家、我、下家、对家
  const displayOrder = [3, 0, 1, 2]; // 对应Player ID：上家=3，我=0，下家=1，对家=2
  const displayNames = displayOrder.map(id => playerNames[id]);
  const displayColors = displayOrder.map(id => playerColors[id]);

  // 获取可选择的被杠玩家（排除当前杠牌的玩家）
  const getAvailableSourcePlayers = () => {
    return displayNames
      .map((name, index) => ({ name, index }))
      .filter(player => player.index !== selectedPlayer);
  };

  // 获取操作类型的中文名称
  const getOperationName = (type: 'hand' | 'discard' | 'peng' | 'angang' | 'zhigang' | 'jiagang'): string => {
    const operationMap = {
      'hand': '添加手牌',
      'discard': '弃牌',
      'peng': '碰牌',
      'angang': '暗杠',
      'zhigang': '直杠',
      'jiagang': '加杠'
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
          
          {/* 第一行：选择玩家和选择操作 */}
          <div className="flex items-center gap-6 flex-wrap">
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
          <div className="flex gap-0.5 flex-wrap">
            {availableTiles
              .filter(tile => {
                // 只显示剩余数量大于0的牌
                const remainingCount = getTileRemainingCount(tile);
                return remainingCount > 0;
              })
              .map((tile, index) => {
                const remainingCount = getTileRemainingCount(tile);
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
              <h3 className="text-sm font-semibold text-gray-700">API同步状态</h3>
              <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
                isApiConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isApiConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                {isApiConnected ? '已连接' : '未连接'}
              </div>
              {lastSyncTime && (
                <span className="text-xs text-gray-500">
                  最后同步: {lastSyncTime.toLocaleTimeString()}
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={syncFromBackend}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                ⬇️ 从后端同步
              </button>
              <button
                onClick={syncToBackend}
                className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
              >
                ⬆️ 同步到后端
              </button>
              <button
                onClick={() => setAutoSync(prev => !prev)}
                className={`px-3 py-1.5 text-xs font-medium ${autoSync ? 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' : 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100'} rounded-md border transition-colors`}
              >
                {autoSync ? '停止自动同步' : '自动同步后端'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard; 