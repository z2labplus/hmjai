import React from 'react';
import { useGameStore } from '../stores/gameStore';

const ConnectionStatus: React.FC = () => {
  const { isApiConnected, lastSyncTime } = useGameStore();

  const formatLastSync = (date: Date | null) => {
    if (!date) return '未同步';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    return `${hours}小时前`;
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div 
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-md text-sm font-medium transition-all duration-300 ${
          isApiConnected 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}
      >
        {/* 连接状态指示灯 */}
        <div 
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isApiConnected 
              ? 'bg-green-500 animate-pulse' 
              : 'bg-red-500'
          }`}
        />
        
        {/* 连接状态文字 */}
        <span>
          {isApiConnected ? '已连接' : '离线模式'}
        </span>
        
        {/* 最后同步时间 */}
        {lastSyncTime && (
          <span className="text-xs opacity-75">
            · {formatLastSync(lastSyncTime)}
          </span>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus; 