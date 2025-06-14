import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameBoard from './components/GameBoard';
import AnalysisPanel from './components/AnalysisPanel';
import SettingsPanel from './components/SettingsPanel';
import { useGameStore } from './stores/gameStore';
import { useSettings } from './hooks/useSettings';

import { MahjongAPI } from './utils/api';
import './App.css';

// 玩家名称映射
const playerNames = {
  0: "我",
  1: "下家", 
  2: "对家",
  3: "上家"
};

// 花色名称映射
const suitNames = {
  wan: "万",
  tiao: "条",
  tong: "筒"
};

function App() {
  const { setAvailableTiles, checkApiConnection, setGameState, syncFromBackend, checkForWinners } = useGameStore();
  const { settings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  
  // 胜利通知显示状态
  const [showWinNotification, setShowWinNotification] = useState(false);
  const [playerWinMessage, setPlayerWinMessage] = useState<any>(null);
  const [lastWinnerCheck, setLastWinnerCheck] = useState<string>('');

  useEffect(() => {
    // 初始化时获取麻将牌信息
    const initializeApp = async () => {
      try {
        // 检查API连接状态
        const isConnected = await checkApiConnection();
        console.log(`🔗 API连接状态: ${isConnected ? '已连接' : '未连接'}`);
        
        if (isConnected) {
          const tiles = await MahjongAPI.getTileCodes();
          setAvailableTiles(tiles);
        } else {
          console.warn('⚠️ 后端服务未连接，部分功能可能不可用');
        }
      } catch (error) {
        console.error('❌ 初始化应用失败:', error);
      }
    };

    initializeApp();
  }, [setAvailableTiles, checkApiConnection]);

  // 轮询检查胜利状态
  useEffect(() => {
    const checkWinners = async () => {
      try {
        // 先同步游戏状态
        await syncFromBackend();
        
        // 检查胜利者
        const winners = await checkForWinners();
        
        if (winners.length > 0) {
          // 生成胜利者标识字符串
          const winnerIds = winners.map(w => `${w.player_id}-${w.win_type}`).join(',');
          
          // 如果有新的胜利者，显示通知
          if (winnerIds !== lastWinnerCheck) {
            const latestWinner = winners[winners.length - 1]; // 显示最新的胜利者
            setPlayerWinMessage(latestWinner);
            setLastWinnerCheck(winnerIds);
            console.log('🏆 检测到新胜利者:', latestWinner);
          }
        }
      } catch (error) {
        console.error('❌ 胜利状态检查失败:', error);
      }
    };

    // 每2秒检查一次胜利状态
    const interval = setInterval(checkWinners, 2000);
    
    return () => clearInterval(interval);
  }, [syncFromBackend, checkForWinners, lastWinnerCheck]);

  // 处理玩家胜利消息
  useEffect(() => {
    if (playerWinMessage) {
      setShowWinNotification(true);
      console.log('🏆 显示胜利通知:', playerWinMessage);
      
      // 5秒后自动隐藏通知
      const timer = setTimeout(() => {
        setShowWinNotification(false);
        setPlayerWinMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [playerWinMessage]);

  // 手动关闭胜利通知
  const handleCloseWinNotification = () => {
    setShowWinNotification(false);
    setPlayerWinMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">
      {/* 头部 - 紧凑版 */}
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="max-w-full mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="text-2xl">🀅</div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  欢乐麻将辅助工具
                </h1>
                <p className="text-xs text-gray-500">
                  智能分析 · 精准建议 · 提升胜率
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>在线服务</span>
              </div>
              
              <button 
                onClick={() => setShowSettings(true)}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="游戏设置"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </motion.div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 flex overflow-hidden">
        <div className="w-full h-full flex">
          {/* 左侧：游戏面板 - 占用更多空间 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 min-w-0 p-4"
          >
            <GameBoard className="h-full w-full" cardBackStyle={settings.cardBackStyle} />
          </motion.div>

          {/* 右侧：分析面板 - 固定宽度 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-80 flex-shrink-0 p-4 pr-6"
          >
            <AnalysisPanel className="h-full" />
          </motion.div>
        </div>
      </main>

      {/* 底部信息 - 更紧凑 */}
      <footer className="bg-white border-t border-gray-200 flex-shrink-0">
        <div className="max-w-full mx-auto px-4 sm:px-6 py-2">
          <div className="flex justify-between items-center text-xs text-gray-600">
            <div className="flex items-center gap-3">
              <span>© 2024 欢乐麻将辅助工具</span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline">智能算法驱动</span>
            </div>
            
            <div className="flex items-center gap-3">
              <a 
                href="/docs" 
                className="hover:text-gray-900 transition-colors"
              >
                使用说明
              </a>
              <a 
                href="/api/docs" 
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-900 transition-colors"
              >
                API文档
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* 设置面板 */}
      <SettingsPanel 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* 胜利通知 */}
      <AnimatePresence>
        {showWinNotification && playerWinMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -100 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-6 rounded-2xl shadow-2xl border-4 border-yellow-300 min-w-96">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl animate-bounce">🎉</div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">
                      {playerNames[playerWinMessage.player_id as keyof typeof playerNames]}胡牌！
                    </h3>
                    <div className="text-lg">
                      {playerWinMessage.win_type === 'zimo' ? (
                        <span className="flex items-center gap-2">
                          <span className="text-2xl">🙌</span>
                          自摸
                          {playerWinMessage.win_tile && (
                            <span className="bg-white text-orange-600 px-2 py-1 rounded-lg font-bold ml-1">
                              {playerWinMessage.win_tile.value}{suitNames[playerWinMessage.win_tile.type as keyof typeof suitNames]}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="text-2xl">🎯</span>
                          点炮胡牌
                          {playerWinMessage.win_tile && (
                            <span className="bg-white text-orange-600 px-2 py-1 rounded-lg font-bold ml-1">
                              {playerWinMessage.win_tile.value}{suitNames[playerWinMessage.win_tile.type as keyof typeof suitNames]}
                            </span>
                          )}
                          {playerWinMessage.dianpao_player_id !== undefined && (
                            <span className="text-sm">
                              (点炮者: {playerNames[playerWinMessage.dianpao_player_id as keyof typeof playerNames]})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleCloseWinNotification}
                  className="text-white hover:text-yellow-200 transition-colors ml-4"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}

export default App; 