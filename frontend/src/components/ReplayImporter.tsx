import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ReplayImporterProps {
  onImport: (replayData: any) => void;
  className?: string;
}

const ReplayImporter: React.FC<ReplayImporterProps> = ({ onImport, className }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const replayData = JSON.parse(text);
      
      // 验证牌谱格式
      if (!replayData.game_info || !replayData.players || !replayData.actions) {
        throw new Error('无效的牌谱格式');
      }

      onImport(replayData);
    } catch (err: any) {
      setError(err.message || '导入失败');
    } finally {
      setIsLoading(false);
    }
  }, [onImport]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
      handleFileUpload(file);
    } else {
      setError('请选择JSON格式的牌谱文件');
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const loadSampleReplay = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 获取最近的游戏列表
      const response = await fetch('/api/v1/replay/list?limit=1');
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        const gameId = result.data[0].game_id;
        
        // 获取完整牌谱
        const replayResponse = await fetch(`/api/v1/replay/${gameId}`);
        const replayResult = await replayResponse.json();
        
        if (replayResult.success) {
          // 转换为导出格式
          const exportResponse = await fetch(`/api/v1/replay/${gameId}/export/json`);
          const replayData = await exportResponse.text();
          const parsedData = JSON.parse(replayData);
          
          onImport(parsedData);
        } else {
          throw new Error('获取牌谱失败');
        }
      } else {
        throw new Error('没有可用的示例牌谱');
      }
    } catch (err: any) {
      setError(err.message || '加载示例失败');
    } finally {
      setIsLoading(false);
    }
  }, [onImport]);

  return (
    <div className={`replay-importer ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">导入牌谱</h3>
        
        {/* 拖拽上传区域 */}
        <motion.div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          animate={{
            scale: isDragging ? 1.02 : 1,
            borderColor: isDragging ? '#3B82F6' : '#D1D5DB'
          }}
        >
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            id="replay-file-input"
          />
          
          {isLoading ? (
            <div className="py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-600">处理中...</p>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-4">📁</div>
              <p className="text-lg text-gray-700 mb-2">
                拖拽JSON牌谱文件到这里
              </p>
              <p className="text-sm text-gray-500 mb-4">
                或点击选择文件
              </p>
              <label
                htmlFor="replay-file-input"
                className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
              >
                选择文件
              </label>
            </>
          )}
        </motion.div>

        {/* 错误提示 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <p className="text-red-600 text-sm">❌ {error}</p>
          </motion.div>
        )}
      </div>

      {/* 示例牌谱 */}
      <div className="border-t pt-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">快速开始</h4>
        <div className="flex gap-3">
          <button
            onClick={loadSampleReplay}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '加载中...' : '加载示例牌谱'}
          </button>
          
          <a
            href="/api/v1/replay/list"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            查看所有牌谱
          </a>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          💡 提示：你也可以先运行 <code className="bg-gray-100 px-1 rounded">python create_sample_replay.py</code> 创建示例牌谱
        </p>
      </div>
    </div>
  );
};

export default ReplayImporter;