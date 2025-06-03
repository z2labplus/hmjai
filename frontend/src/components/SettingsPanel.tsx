import React from 'react';
import { motion } from 'framer-motion';
import MahjongTile from './MahjongTile';
import { createTile, TileType } from '../types/mahjong';
import { useSettings } from '../hooks/useSettings';
import { CardBackStyle } from './MahjongTile';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CardBackOption {
  id: CardBackStyle;
  name: string;
  description: string;
  preview: {
    background: string;
    pattern: React.ReactNode;
  };
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { settings, updateCardBackStyle, updateAnimations, updateAutoSave } = useSettings();

  const cardBackOptions: CardBackOption[] = [
    {
      id: 'classic',
      name: '经典绿色',
      description: '传统麻将牌背面',
      preview: {
        background: 'bg-gradient-to-br from-green-600 to-green-800 border-green-700',
        pattern: (
          <div className="flex flex-col items-center justify-center text-white">
            <div className="text-xs opacity-90">🀄</div>
            <div className="w-full h-0.5 bg-white/30 my-0.5"></div>
            <div className="text-xs opacity-90">🀄</div>
          </div>
        )
      }
    },
    {
      id: 'elegant',
      name: '素雅白玉',
      description: '简约现代风格',
      preview: {
        background: 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300',
        pattern: (
          <div className="flex flex-col items-center justify-center">
            {/* 纯色背景，不显示任何图案 */}
          </div>
        )
      }
    },
    {
      id: 'bamboo',
      name: '竹韵青风',
      description: '淡雅竹纹风格',
      preview: {
        background: 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200',
        pattern: (
          <div className="flex flex-col items-center justify-center text-emerald-600">
            <div className="text-xs opacity-70">竹</div>
            <div className="flex space-x-0.5 my-1">
              <div className="w-0.5 h-3 bg-emerald-400/50"></div>
              <div className="w-0.5 h-3 bg-emerald-400/50"></div>
              <div className="w-0.5 h-3 bg-emerald-400/50"></div>
            </div>
            <div className="text-xs opacity-70">韵</div>
          </div>
        )
      }
    },
    {
      id: 'cloud',
      name: '云纹素白',
      description: '古典云纹图案',
      preview: {
        background: 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200',
        pattern: (
          <div className="flex flex-col items-center justify-center text-slate-500">
            <div className="text-xs opacity-60">☁</div>
            <div className="w-4 h-px bg-slate-300/60 my-1"></div>
            <div className="text-xs opacity-60">☁</div>
          </div>
        )
      }
    },
    {
      id: 'traditional',
      name: '传统红木',
      description: '中式红木风格',
      preview: {
        background: 'bg-gradient-to-br from-red-900 to-red-950 border-red-800',
        pattern: (
          <div className="flex flex-col items-center justify-center text-yellow-200">
            <div className="text-xs opacity-80">麻</div>
            <div className="w-3 h-0.5 bg-yellow-200/40 my-0.5"></div>
            <div className="text-xs opacity-80">将</div>
          </div>
        )
      }
    },
    {
      id: 'pure',
      name: '极简纯色',
      description: '完全纯色，无任何图案',
      preview: {
        background: 'bg-gray-200 border-gray-300',
        pattern: (
          <div className="flex flex-col items-center justify-center">
            {/* 完全纯色，无任何图案 */}
          </div>
        )
      }
    }
  ];

  const handleBackStyleChange = (style: CardBackStyle) => {
    updateCardBackStyle(style);
  };

  const sampleTile = createTile(TileType.WAN, 1);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">游戏设置</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {/* 麻将牌背面样式设置 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">麻将牌背面样式</h3>
            <p className="text-sm text-gray-600 mb-6">选择您喜欢的麻将牌背面风格</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cardBackOptions.map((option) => (
                <motion.div
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    settings.cardBackStyle === option.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleBackStyleChange(option.id)}
                >
                  <div className="flex items-center space-x-4">
                    {/* 预览卡片 */}
                    <div className={`w-12 h-16 rounded-lg border-2 flex items-center justify-center ${option.preview.background}`}>
                      {option.preview.pattern}
                    </div>
                    
                    {/* 选项信息 */}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{option.name}</h4>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                    
                    {/* 选中标识 */}
                    {settings.cardBackStyle === option.id && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 预览区域 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">预览效果</h4>
              <div className="flex items-center justify-center space-x-2">
                <MahjongTile tile={sampleTile} variant="default" size="medium" />
                <div className="text-gray-400">→</div>
                <MahjongTile 
                  tile={sampleTile} 
                  variant="back" 
                  size="medium" 
                  cardBackStyle={settings.cardBackStyle}
                />
              </div>
            </div>
          </div>

          {/* 其他设置选项 */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">其他设置</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">动画效果</h4>
                  <p className="text-sm text-gray-600">启用麻将牌动画效果</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.enableAnimations}
                    onChange={(e) => updateAnimations(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">自动保存</h4>
                  <p className="text-sm text-gray-600">自动保存游戏状态</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.autoSave}
                    onChange={(e) => updateAutoSave(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            保存设置
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsPanel; 