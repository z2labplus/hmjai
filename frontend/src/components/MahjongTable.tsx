import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore, selectPlayerHand } from '../stores/gameStore';
import { Tile, MeldType, GangType, calculateRemainingTiles } from '../types/mahjong';
import MahjongTile from './MahjongTile';
import SimpleSourceIndicator from './SimpleSourceIndicator';
import { CardBackStyle } from './MahjongTile';

interface MahjongTableProps {
  className?: string;
  cardBackStyle?: CardBackStyle;
}

const MahjongTable: React.FC<MahjongTableProps> = ({ className, cardBackStyle = 'elegant' }) => {
  const gameState = useGameStore(state => state.gameState);
  const player0Hand = useGameStore(selectPlayerHand(0));
  const player1Hand = useGameStore(selectPlayerHand(1));
  const player2Hand = useGameStore(selectPlayerHand(2));
  const player3Hand = useGameStore(selectPlayerHand(3));
  
  const player0Discards = useGameStore(state => state.gameState.player_discarded_tiles?.[0] || []);
  const player1Discards = useGameStore(state => state.gameState.player_discarded_tiles?.[1] || []);
  const player2Discards = useGameStore(state => state.gameState.player_discarded_tiles?.[2] || []);
  const player3Discards = useGameStore(state => state.gameState.player_discarded_tiles?.[3] || []);

  const remainingTiles = calculateRemainingTiles(gameState);
  const playerNames = ['我', '下家', '对家', '上家'];
  const playerColors = ['bg-blue-50 border-blue-200', 'bg-green-50 border-green-200', 'bg-red-50 border-red-200', 'bg-yellow-50 border-yellow-200'];
  
  // 展示顺序：上家、我、下家、对家
  const displayOrder = [3, 0, 1, 2];

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
              (手牌: {hand.tiles.length} | 碰杠: {hand.melds.length} | 弃牌: {discards.length}
            </div>
          </div>
        </div>

        {/* 内容区域 - 可滚动 */}
        <div style={{ height: '80px', }}>
          {/* 手牌和碰杠牌 - 分开显示，手牌与碰杠牌间有较大间距(gap-4) */}
          <div className="mb-1">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px'}}>
              {/* 手牌区域 */}
              {hand.tiles.length > 0 && (
                <div style={{ display: 'flex' }}>
                  {hand.tiles.map((tile: Tile, index: number) => (
                    <MahjongTile
                      key={`player-${playerId}-hand-${index}`}
                      tile={tile}
                      size="small"
                      variant={playerId === 0 ? "default" : "back"}
                      seamless={true}
                      cardBackStyle={cardBackStyle}
                    />
                  ))}
                </div>
              )}
              
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
      {/* 标题和剩余牌数 - 同一行显示 */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold text-gray-800">血战到底</h2>
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
