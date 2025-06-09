import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore, selectPlayerHand } from '../stores/gameStore';
import { calculateRemainingTiles, calculateRemainingTilesByType, TileType } from '../types/mahjong';
import { Tile, MeldType, GangType } from '../types/mahjong';
import MahjongTile from './MahjongTile';
import SimpleSourceIndicator from './SimpleSourceIndicator';
import { CardBackStyle } from './MahjongTile';

interface MahjongTableProps {
  className?: string;
  cardBackStyle?: CardBackStyle;
}

const MahjongTable: React.FC<MahjongTableProps> = ({ className, cardBackStyle = 'elegant' }) => {
  const gameState = useGameStore(state => state.gameState);
  const { reorderPlayerHand, removeTileFromHand, addDiscardedTile } = useGameStore(state => ({
    reorderPlayerHand: state.reorderPlayerHand,
    removeTileFromHand: state.removeTileFromHand,
    addDiscardedTile: state.addDiscardedTile
  }));
  
  // 获取玩家手牌，如果不存在则返回空数组
  const getPlayerHand = (playerId: number) => {
    const playerIdStr = playerId.toString();
    const hand = gameState.player_hands[playerIdStr];
    if (!hand) {
      return { tiles: [], tile_count: 0, melds: [] };
    }
    return {
      tiles: hand.tiles || [],
      tile_count: hand.tile_count || (hand.tiles?.length || 0),
      melds: hand.melds || []
    };
  };
  
  const player0Hand = getPlayerHand(0);
  const player1Hand = getPlayerHand(1);
  const player2Hand = getPlayerHand(2);
  const player3Hand = getPlayerHand(3);
  
  // 获取玩家弃牌，如果不存在则返回空数组
  const getPlayerDiscards = (playerId: number) => {
    const playerIdStr = playerId.toString();
    return gameState.player_discarded_tiles?.[playerIdStr] || [];
  };
  
  const player0Discards = getPlayerDiscards(0);
  const player1Discards = getPlayerDiscards(1);
  const player2Discards = getPlayerDiscards(2);
  const player3Discards = getPlayerDiscards(3);

  // 拖拽状态管理
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 剩余牌数：使用原有逻辑（108 - 所有已使用的牌）
  const remainingTiles = calculateRemainingTiles(gameState);
  
  // 计算未出牌数：所有可见麻将牌的剩余数量之和（基于可见牌逻辑）
  const calculateUnplayedTiles = (): number => {
    const remainingTilesByType = calculateRemainingTilesByType(gameState);
    let unplayedTotal = 0;
    
    // 万子 1-9
    for (let i = 1; i <= 9; i++) {
      const count = remainingTilesByType[`${TileType.WAN}-${i}`] || 0;
      if (count > 0) {
        unplayedTotal += count;
      }
    }
    
    // 条子 1-9
    for (let i = 1; i <= 9; i++) {
      const count = remainingTilesByType[`${TileType.TIAO}-${i}`] || 0;
      if (count > 0) {
        unplayedTotal += count;
      }
    }
    
    // 筒子 1-9
    for (let i = 1; i <= 9; i++) {
      const count = remainingTilesByType[`${TileType.TONG}-${i}`] || 0;
      if (count > 0) {
        unplayedTotal += count;
      }
    }
    
    return unplayedTotal;
  };
  
  // 未出牌数：等于选择区域中显示的所有牌的右上角数字之和
  const unplayedTiles = calculateUnplayedTiles();
  
  const playerNames = ['0我', '1下家', '2对家', '3上家'];
  const playerColors = ['bg-blue-50 border-blue-200', 'bg-green-50 border-green-200', 'bg-red-50 border-red-200', 'bg-yellow-50 border-yellow-200'];
  
  // 展示顺序：上家、我、下家、对家
  const displayOrder = [3, 0, 1, 2];

  // 拖拽事件处理函数
  const handleDragStart = (e: React.DragEvent, index: number, playerId: number) => {
    // 只允许"我"（playerId=0）的手牌拖拽
    if (playerId !== 0) {
      e.preventDefault();
      return;
    }
    
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number, playerId: number) => {
    if (playerId !== 0 || draggedIndex === null) {
      return;
    }
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnter = (e: React.DragEvent, index: number, playerId: number) => {
    if (playerId !== 0) {
      return;
    }
    
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // 只有当鼠标真正离开组件时才清除dragOverIndex
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number, playerId: number) => {
    if (playerId !== 0 || draggedIndex === null) {
      return;
    }
    
    e.preventDefault();
    
    const playerHand = [player0Hand, player1Hand, player2Hand, player3Hand][playerId];
    const newTiles = [...playerHand.tiles];
    
    // 移动牌到新位置
    const draggedTile = newTiles[draggedIndex];
    newTiles.splice(draggedIndex, 1);
    newTiles.splice(targetIndex, 0, draggedTile);
    
    // 更新游戏状态
    reorderPlayerHand(playerId, newTiles);
    
    // 重置拖拽状态
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 双击事件处理函数 - 弃牌
  const handleTileDoubleClick = (tile: Tile, index: number, playerId: number) => {
    // 只允许"我"（playerId=0）的手牌双击弃牌
    if (playerId !== 0) {
      return;
    }
    
    // 从手牌中移除
    removeTileFromHand(playerId, tile);
    
    // 添加到弃牌堆
    addDiscardedTile(tile, playerId);
  };

  // 渲染弃牌组（不换行，一行显示）
  const renderDiscardGroup = (tiles: Tile[], prefix: string) => {
    if (tiles.length === 0) return null;
    
    return (
      <div className="flex gap-0">
        {tiles.map((tile: Tile, index: number) => (
          <MahjongTile
            key={`${prefix}-discard-${index}`}
            tile={tile}
            size="tiny"
            variant="disabled"
            seamless={true}
            animationDelay={index * 0.01}
            cardBackStyle={cardBackStyle}
          />
        ))}
      </div>
    );
  };

  // 计算碰杠牌的总张数
  const calculateMeldTilesCount = (melds: any[]) => {
    return melds.reduce((total, meld) => total + meld.tiles.length, 0);
  };

  // 渲染单个玩家区域
  const renderPlayerArea = (playerId: number) => {
    const hand = [player0Hand, player1Hand, player2Hand, player3Hand][playerId];
    const discards = [player0Discards, player1Discards, player2Discards, player3Discards][playerId];
    
    return (
      <div className={`border-2 rounded-lg p-4 ${playerColors[playerId]} transition-all duration-200 hover:shadow-md`} style={{ height: '140px', }}>
        {/* 玩家名称和统计信息 */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-800">{playerNames[playerId]}</h3>
            <div className="text-sm text-gray-600">
              (手牌: {hand.tile_count || (hand.tiles?.length || 0)} | 碰杠: {calculateMeldTilesCount(hand.melds)} | 弃牌: {discards.length})
            </div>
          </div>
        </div>

        {/* 内容区域 - 可滚动 */}
        <div style={{ height: '80px', }}>
          {/* 手牌和碰杠牌 - 分开显示，手牌与碰杠牌间有较大间距(gap-4) */}
          <div className="mb-1">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px'}}>
              {/* 手牌区域 */}
              {(() => {
                const handTileCount = hand.tile_count || (hand.tiles?.length || 0);
                
                if (handTileCount > 0) {
                  return (
                    <div style={{ display: 'flex' }}>
                      {/* 玩家0（我）：显示具体牌面 */}
                      {playerId === 0 && hand.tiles ? (
                        hand.tiles.map((tile: Tile, index: number) => {
                          const isDragging = draggedIndex === index && playerId === 0;
                          const isDragOver = dragOverIndex === index && playerId === 0;
                          
                          return (
                            <div
                              key={`player-${playerId}-hand-${index}`}
                              draggable={playerId === 0} // 只有"我"的手牌可以拖拽
                              onDragStart={(e) => handleDragStart(e, index, playerId)}
                              onDragOver={(e) => handleDragOver(e, index, playerId)}
                              onDragEnter={(e) => handleDragEnter(e, index, playerId)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, index, playerId)}
                              onDragEnd={handleDragEnd}
                              onDoubleClick={() => handleTileDoubleClick(tile, index, playerId)} // 添加双击事件
                              className={`transition-all duration-200 ${
                                'cursor-grab active:cursor-grabbing hover:cursor-pointer'
                              } ${
                                isDragging ? 'opacity-50 scale-105' : ''
                              } ${
                                isDragOver ? 'transform scale-110' : ''
                              }`}
                              style={{
                                transform: isDragOver ? 'translateY(-4px)' : 'none',
                                filter: isDragging ? 'brightness(1.1)' : 'none'
                              }}
                              title="拖拽重排 | 双击弃牌" // 添加提示文字
                            >
                              <MahjongTile
                                tile={tile}
                                size="small"
                                variant="default"
                                seamless={true}
                                cardBackStyle={cardBackStyle}
                              />
                            </div>
                          );
                        })
                      ) : (
                        /* 其他玩家：显示对应数量的背面牌 */
                        Array.from({ length: handTileCount }, (_, index) => (
                          <div
                            key={`player-${playerId}-back-${index}`}
                            className="transition-all duration-200"
                            title={`玩家${playerNames[playerId]}的手牌`}
                          >
                            <MahjongTile
                              tile={{ type: 'wan' as any, value: 1 }} // 虚拟牌，不会显示具体内容
                              size="small"
                              variant="back"
                              seamless={true}
                              cardBackStyle={cardBackStyle}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* 碰牌杠牌区域 - 组间有小间隙(gap-2) */}
              {hand.melds.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  {hand.melds.map((meld, index) => (
                    <div key={`meld-${index}`} className="relative" style={{ 
                      display: 'flex', 
                      alignItems: 'flex-end',
                      backgroundColor: 'rgba(255,255,255,0.8)', 
                      padding: '0px 2px', 
                      borderRadius: '1px', 
                      border: '0px solid rgba(0,0,0,0.1)' 
                    }}>
                      {meld.tiles.map((tile: Tile, tileIndex: number) => {
                        // 暗杠显示逻辑
                        let variant: 'default' | 'selected' | 'selectedHorizontal' | 'recommended' | 'disabled' | 'disabledHorizontal' | 'back' = 'default';
                        let additionalClassName = '';
                        
                        if (meld.type === MeldType.GANG && meld.gang_type === GangType.AN_GANG) {
                          if (playerId === 0) {
                            // 我的暗杠：所有4张牌都显示为disabled样式
                            variant = 'disabled';
                          } else {
                            // 其他玩家的暗杠：全部显示背面
                            variant = 'back';
                          }
                        } else if (meld.type === MeldType.GANG && meld.gang_type === GangType.JIA_GANG) {
                          // 加杠显示逻辑：前3张正常显示，最后一张使用横向disabled样式
                          if (tileIndex === 3) {
                            variant = 'disabled';
                          } else {
                            variant = 'default';
                          }
                        } else if (meld.type === MeldType.GANG && meld.gang_type === GangType.MING_GANG) {
                          // 直杠显示逻辑：前3张正常显示，第4张使用横向选中样式
                          if (tileIndex === 3) {
                            variant = 'selected';
                          } else {
                            variant = 'default';
                          }
                        }
                        
                        return (
                          <div key={`meld-tile-${index}-${tileIndex}`} className="relative">
                            <MahjongTile
                              tile={tile}
                              size="small"
                              variant={variant}
                              seamless={true}
                              className={additionalClassName}
                              cardBackStyle={cardBackStyle}
                            />
                            
                            {/* 明杠来源指示器 - 只在第4张牌上显示 */}
                            {meld.type === MeldType.GANG && 
                             meld.gang_type === GangType.MING_GANG && 
                             tileIndex === 3 && 
                             meld.source_player !== undefined && (
                              <SimpleSourceIndicator
                                sourcePlayer={meld.source_player}
                                currentPlayer={playerId}
                                className="absolute -top-1 -right-1"
                              />
                            )}
                            
                            {/* 碰牌来源指示器 - 只在第3张牌上显示 */}
                            {meld.type === MeldType.PENG && 
                             tileIndex === 2 && 
                             meld.source_player !== undefined && (
                              <SimpleSourceIndicator
                                sourcePlayer={meld.source_player}
                                currentPlayer={playerId}
                                className="absolute -top-1 -right-1"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
              
            </div>
          </div>

          {/* 弃牌 */}
          <div>
            {renderDiscardGroup(discards, `player-${playerId}`)}
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className={`bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-2 ${className}`}>
      {/* 标题和统计信息 - 同一行显示 */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold text-gray-800">血战到底</h2>
        <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-4">
          {/* 未出牌数 */}
          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border">
            <span className="text-sm text-gray-600">未出牌数:</span>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="text-xl font-bold text-blue-600"
            >
              {unplayedTiles}
            </motion.div>
          </div>
          {/* 剩余牌数 */}
          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border">
            <span className="text-sm text-gray-600">剩余牌数:</span>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-xl font-bold text-green-600"
            >
              {remainingTiles}
            </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* 玩家区域 - 单列布局，按顺序：上家、我、下家、对家 */}
      <div className="space-y-1">
        {displayOrder.map((playerId) => (
          <div key={`player-${playerId}`}>
            {renderPlayerArea(playerId)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MahjongTable;
