import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameStore, selectMyHand, selectDiscardedTiles } from '../stores/gameStore';
import { Tile, TileType, createTile, tileToString, tilesEqual, Meld, MeldType, GangType } from '../types/mahjong';
import MahjongTile from './MahjongTile';
import MahjongTable from './MahjongTable';
import { CardBackStyle } from './MahjongTile';

interface GameBoardProps {
  className?: string;
  cardBackStyle?: CardBackStyle;
}

const GameBoard: React.FC<GameBoardProps> = ({ className, cardBackStyle = 'elegant' }) => {
  const myHand = useGameStore(selectMyHand());
  const discardedTiles = useGameStore(selectDiscardedTiles());
  const { addTileToHand, removeTileFromHand, addDiscardedTile, addMeld } = useGameStore();
  
  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const [inputMode, setInputMode] = useState<'hand' | 'discard' | 'peng' | 'angang' | 'zhigang' | 'jiagang'>('hand');
  const [selectedDiscardPlayer, setSelectedDiscardPlayer] = useState<number>(0); // 默认为上家（显示索引0）
  const [selectedHandPlayer, setSelectedHandPlayer] = useState<number>(0); // 默认为上家（显示索引0）
  
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
  
  const handleTileClick = (tile: Tile) => {
    const actualPlayerId = displayOrder[selectedHandPlayer]; // 转换显示索引为实际Player ID
    const actualDiscardPlayerId = displayOrder[selectedDiscardPlayer]; // 转换显示索引为实际Player ID
    
    if (inputMode === 'hand') {
      // 为当前选中的玩家添加手牌
      addTileToHand(actualPlayerId, tile);
    } else if (inputMode === 'discard') {
      addDiscardedTile(tile, actualDiscardPlayerId);
    } else if (inputMode === 'peng') {
      // 碰牌：创建碰牌组并添加到melds
      const meld: Meld = {
        type: MeldType.PENG,
        tiles: [tile, tile, tile],
        exposed: true
      };
      addMeld(actualPlayerId, meld);
    } else if (inputMode === 'angang') {
      // 暗杠：创建暗杠组并添加到melds
      const meld: Meld = {
        type: MeldType.GANG,
        tiles: [tile, tile, tile, tile],
        exposed: false,
        gang_type: GangType.AN_GANG
      };
      addMeld(actualPlayerId, meld);
    } else if (inputMode === 'zhigang') {
      // 直杠：创建明杠组并添加到melds
      const meld: Meld = {
        type: MeldType.GANG,
        tiles: [tile, tile, tile, tile],
        exposed: true,
        gang_type: GangType.MING_GANG
      };
      addMeld(actualPlayerId, meld);
    } else if (inputMode === 'jiagang') {
      // 加杠：创建明杠组并添加到melds
      const meld: Meld = {
        type: MeldType.GANG,
        tiles: [tile, tile, tile, tile],
        exposed: true,
        gang_type: GangType.JIA_GANG  // 使用JIA_GANG类型
      };
      addMeld(actualPlayerId, meld);
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

  const playerNames = ['我', '下家', '对家', '上家']; // Player ID映射：0=我，1=下家，2=对家，3=上家
  const playerColors = ['text-blue-600', 'text-green-600', 'text-red-600', 'text-yellow-600'];
  
  // 用于界面显示的玩家顺序：上家、我、下家、对家
  const displayOrder = [3, 0, 1, 2]; // 对应Player ID：上家=3，我=0，下家=1，对家=2
  const displayNames = displayOrder.map(id => playerNames[id]);
  const displayColors = displayOrder.map(id => playerColors[id]);

  return (
    <div className={`bg-green-100 rounded-lg p-3 h-full flex flex-col ${className}`}>
      {/* 麻将桌布局 - 与选择麻将牌区域相同的宽度 */}
      <div className="bg-white rounded-lg p-3 border border-gray-300 mb-3">
        <MahjongTable cardBackStyle={cardBackStyle} />
      </div>
      
      {/* 输入模式切换 - 增加为其他玩家添加手牌的选项 */}
      <div className="mb-3 flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setInputMode('hand')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                inputMode === 'hand'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              添加到手牌
            </button>
            <button
              onClick={() => setInputMode('discard')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                inputMode === 'discard'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              直接弃牌
            </button>
            <button
              onClick={() => setInputMode('peng')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                inputMode === 'peng'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              碰牌
            </button>
            <button
              onClick={() => setInputMode('angang')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                inputMode === 'angang'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              暗杠
            </button>
            <button
              onClick={() => setInputMode('zhigang')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                inputMode === 'zhigang'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              直杠
            </button>
            <button
              onClick={() => setInputMode('jiagang')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                inputMode === 'jiagang'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              加杠
            </button>
          </div>

          {/* 手牌玩家选择 */}
          {(inputMode === 'hand' || inputMode === 'peng' || inputMode === 'angang' || inputMode === 'zhigang' || inputMode === 'jiagang') && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">
                {inputMode === 'hand' ? '为谁添加手牌:' : 
                 inputMode === 'peng' ? '为谁添加碰牌:' :
                 inputMode === 'angang' ? '为谁添加暗杠:' : 
                 inputMode === 'zhigang' ? '为谁添加直杠:' : 
                 '为谁添加加杠:'}
              </span>
              <div className="flex gap-1">
                {displayNames.map((name, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedHandPlayer(index)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      selectedHandPlayer === index
                        ? `bg-opacity-20 ${displayColors[index].replace('text-', 'bg-').replace('-600', '-200')} ${displayColors[index]} border border-current`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 弃牌对手选择 */}
          {inputMode === 'discard' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">弃牌玩家:</span>
              <div className="flex gap-1">
                {displayNames.map((name, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedDiscardPlayer(index)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      selectedDiscardPlayer === index
                        ? `bg-opacity-20 ${displayColors[index].replace('text-', 'bg-').replace('-600', '-200')} ${displayColors[index]} border border-current`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
        <h3 className="text-base font-semibold text-gray-700 mb-3">
          选择麻将牌 
          {inputMode === 'hand' && (
            <span className="text-sm text-gray-500 ml-2">
              (为 {displayNames[selectedHandPlayer]} 添加手牌)
            </span>
          )}
          {inputMode === 'discard' && (
            <span className="text-sm text-gray-500 ml-2">
              (弃牌到牌桌 - {displayNames[selectedDiscardPlayer]})
            </span>
          )}
          {inputMode === 'peng' && (
            <span className="text-sm text-gray-500 ml-2">
              (为 {displayNames[selectedHandPlayer]} 添加碰牌)
            </span>
          )}
          {inputMode === 'angang' && (
            <span className="text-sm text-gray-500 ml-2">
              (为 {displayNames[selectedHandPlayer]} 添加暗杠)
            </span>
          )}
          {inputMode === 'zhigang' && (
            <span className="text-sm text-gray-500 ml-2">
              (为 {displayNames[selectedHandPlayer]} 添加直杠)
            </span>
          )}
          {inputMode === 'jiagang' && (
            <span className="text-sm text-gray-500 ml-2">
              (为 {displayNames[selectedHandPlayer]} 添加加杠)
            </span>
          )}
        </h3>
        
        {/* 所有麻将牌一列显示 */}
        <div>
          <div className="flex gap-0.5 flex-wrap">
            {availableTiles.map((tile, index) => (
              <MahjongTile
                key={`tile-${tile.type}-${tile.value}`}
                tile={tile}
                size="small"
                onClick={() => handleTileClick(tile)}
                animationDelay={index * 0.02}
                cardBackStyle={cardBackStyle}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard; 