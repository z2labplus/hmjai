import React, { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import MahjongApiClient from '../services/MahjongApiClient';

interface MissingSuitControlProps {
  className?: string;
}

const MissingSuitControl: React.FC<MissingSuitControlProps> = ({ className }) => {
  const gameState = useGameStore(state => state.gameState);
  const { setPlayerMissingSuit, getMissingSuits } = useGameStore();
  const [isLoading, setIsLoading] = useState(false);

  const playerNames = ['0我', '1下家', '2对家', '3上家'];
  const suitOptions = [
    { value: 'wan', label: '万', color: 'text-red-600 bg-red-100' },
    { value: 'tiao', label: '条', color: 'text-green-600 bg-green-100' },
    { value: 'tong', label: '筒', color: 'text-blue-600 bg-blue-100' }
  ] as const;

  // 获取玩家当前定缺
  const getPlayerMissingSuit = (playerId: number) => {
    const playerIdStr = playerId.toString();
    return gameState.player_hands[playerIdStr]?.missing_suit || null;
  };

  // 设置玩家定缺
  const handleSetMissingSuit = async (playerId: number, missingSuit: 'wan' | 'tiao' | 'tong') => {
    setIsLoading(true);
    try {
      const response = await MahjongApiClient.setMissingSuit(playerId, missingSuit);
      if (response.success) {
        setPlayerMissingSuit(playerId, missingSuit);
        console.log(`✅ 玩家${playerId}定缺设置成功: ${missingSuit}`);
      } else {
        console.error('❌ 定缺设置失败:', response.message);
      }
    } catch (error) {
      console.error('❌ 定缺API调用失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 清除玩家定缺
  const handleClearMissingSuit = async (playerId: number) => {
    setIsLoading(true);
    try {
      const response = await MahjongApiClient.setMissingSuit(playerId, null as any);
      if (response.success) {
        setPlayerMissingSuit(playerId, null);
        console.log(`✅ 玩家${playerId}定缺清除成功`);
      }
    } catch (error) {
      console.error('❌ 清除定缺失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 重置所有定缺
  const handleResetAll = async () => {
    setIsLoading(true);
    try {
      const response = await MahjongApiClient.resetMissingSuits();
      if (response.success) {
        // 清除所有玩家的定缺
        for (let i = 0; i < 4; i++) {
          setPlayerMissingSuit(i, null);
        }
        console.log('✅ 所有玩家定缺已重置');
      }
    } catch (error) {
      console.error('❌ 重置定缺失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载定缺信息
  const handleLoadMissingSuits = async () => {
    setIsLoading(true);
    try {
      await getMissingSuits();
      console.log('✅ 定缺信息加载成功');
    } catch (error) {
      console.error('❌ 加载定缺信息失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg p-4 border border-gray-200 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🎯 定缺设置</h3>
        <div className="flex gap-2">
          <button
            onClick={handleLoadMissingSuits}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
          >
            刷新
          </button>
          <button
            onClick={handleResetAll}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100 disabled:opacity-50"
          >
            重置全部
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map(playerId => {
          const currentMissingSuit = getPlayerMissingSuit(playerId);
          
          return (
            <div key={playerId} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-700">{playerNames[playerId]}</span>
                {currentMissingSuit && (
                  <button
                    onClick={() => handleClearMissingSuit(playerId)}
                    disabled={isLoading}
                    className="text-xs text-gray-500 hover:text-red-500 disabled:opacity-50"
                  >
                    清除
                  </button>
                )}
              </div>
              
              <div className="flex gap-1">
                {suitOptions.map(suit => {
                  const isSelected = currentMissingSuit === suit.value;
                  
                  return (
                    <button
                      key={suit.value}
                      onClick={() => handleSetMissingSuit(playerId, suit.value)}
                      disabled={isLoading}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-all disabled:opacity-50 ${
                        isSelected
                          ? `${suit.color} border-2 border-current shadow-sm`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                      }`}
                    >
                      {suit.label}
                    </button>
                  );
                })}
              </div>
              
              {currentMissingSuit && (
                <div className="mt-2 text-xs text-gray-500">
                  已定缺: <span className="font-medium text-yellow-600">
                    {suitOptions.find(s => s.value === currentMissingSuit)?.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isLoading && (
        <div className="mt-3 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            处理中...
          </div>
        </div>
      )}
    </div>
  );
};

export default MissingSuitControl; 