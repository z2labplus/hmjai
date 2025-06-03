import React, { useState } from 'react';
import { useGameStore, selectAnalysis, selectIsAnalyzing } from '../stores/gameStore';
import { MahjongAPI } from '../utils/api';
import { codeToTile, TileType } from '../types/mahjong';
import MahjongTile from './MahjongTile';

interface AnalysisPanelProps {
  className?: string;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ className }) => {
  const gameState = useGameStore(state => state.gameState);
  const analysisResult = useGameStore(selectAnalysis());
  const isAnalyzing = useGameStore(selectIsAnalyzing());
  const { setAnalysisResult, setIsAnalyzing } = useGameStore();
  
  const [error, setError] = useState<string | null>(null);
  
  // 执行分析
  const handleAnalyze = async () => {
    if (gameState.player_hands[0].tiles.length === 0) {
      setError('请先添加手牌');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await MahjongAPI.analyzeGame({
        game_state: gameState,
        target_player: 0
      });
      
      if (response.success && response.analysis) {
        setAnalysisResult(response.analysis);
      } else {
        setError(response.message || '分析失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // 渲染剩余牌统计
  const renderRemainingTiles = () => {
    if (!analysisResult) return null;
    
    const remainingTiles = analysisResult.remaining_tiles_count;
    const tileGroups = {
      wan: [] as Array<{ code: number; count: number; tile: any }>,
      tiao: [] as Array<{ code: number; count: number; tile: any }>,
      tong: [] as Array<{ code: number; count: number; tile: any }>,
      zi: [] as Array<{ code: number; count: number; tile: any }>
    };
    
    // 分组整理剩余牌
    Object.entries(remainingTiles).forEach(([codeStr, count]) => {
      const code = parseInt(codeStr);
      if (count > 0) {
        const tile = codeToTile(code);
        const item = { code, count, tile };
        
        if (tile.type === TileType.WAN) {
          tileGroups.wan.push(item);
        } else if (tile.type === TileType.TIAO) {
          tileGroups.tiao.push(item);
        } else if (tile.type === TileType.TONG) {
          tileGroups.tong.push(item);
        } else if (tile.type === TileType.ZI) {
          tileGroups.zi.push(item);
        }
      }
    });
    
    return (
      <div className="space-y-4">
        {Object.entries(tileGroups).map(([type, tiles]) => {
          if (tiles.length === 0) return null;
          
          const typeNames = {
            wan: '万子',
            tiao: '条子',
            tong: '筒子',
            zi: '字牌'
          };
          
          return (
            <div key={type} className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {typeNames[type as keyof typeof typeNames]}
              </h4>
              <div className="flex flex-wrap gap-2">
                {tiles.map(({ tile, count }) => (
                  <div key={tile.value} className="relative">
                    <MahjongTile tile={tile} size="small" variant="disabled" />
                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // 渲染弃牌分数
  const renderDiscardScores = () => {
    if (!analysisResult?.discard_scores) return null;
    
    const scores = Object.entries(analysisResult.discard_scores)
      .sort(([, a], [, b]) => b - a) // 按分数降序排列
      .slice(0, 5); // 只显示前5个
    
    return (
      <div className="space-y-2">
        {scores.map(([tileStr, score], index) => (
          <div key={tileStr} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="font-medium">{tileStr}</span>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    index === 0 ? 'bg-red-500' : 
                    index === 1 ? 'bg-orange-500' : 
                    'bg-gray-400'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (score + 10) * 5))}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 w-12 text-right">
                {score.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className={`bg-white rounded-lg p-6 h-full flex flex-col ${className}`}>
      {/* 标题和分析按钮 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">📊 智能分析</h2>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              isAnalyzing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
            }`}
          >
            {isAnalyzing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                分析中...
              </div>
            ) : (
              '开始分析'
            )}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>
      
      {/* 分析结果 */}
      {analysisResult && (
        <div className="flex-1 space-y-6 overflow-y-auto">
          {/* 核心建议 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">🎯 推荐建议</h3>
            
            {analysisResult.recommended_discard && (
              <div className="mb-3">
                <span className="text-sm text-blue-600 font-medium">建议弃牌：</span>
                <div className="mt-1">
                  <MahjongTile 
                    tile={analysisResult.recommended_discard} 
                    variant="recommended"
                    size="medium"
                  />
                </div>
              </div>
            )}
            
            <div className="mb-3">
              <span className="text-sm text-blue-600 font-medium">胡牌概率：</span>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, analysisResult.win_probability * 100)}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-blue-800">
                  {(analysisResult.win_probability * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            
            {analysisResult.listen_tiles.length > 0 && (
              <div>
                <span className="text-sm text-blue-600 font-medium">听牌：</span>
                <div className="mt-1 flex gap-1">
                  {analysisResult.listen_tiles.map((tile, index) => (
                    <MahjongTile 
                      key={index}
                      tile={tile} 
                      size="small"
                      variant="recommended"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* 建议列表 */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-3">💡 分析建议</h3>
            <ul className="space-y-2">
              {analysisResult.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-green-700">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span className="text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* 弃牌分数 */}
          <div className="bg-orange-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-orange-800 mb-3">📈 弃牌分析</h3>
            {renderDiscardScores()}
          </div>
          
          {/* 剩余牌统计 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🔢 剩余牌统计</h3>
            {renderRemainingTiles()}
          </div>
        </div>
      )}
      
      {/* 空状态 */}
      {!analysisResult && !isAnalyzing && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-lg font-medium mb-2">智能分析助手</h3>
            <p className="text-sm">
              添加手牌后点击"开始分析"<br />
              获取专业的弃牌建议和胡牌概率
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel; 