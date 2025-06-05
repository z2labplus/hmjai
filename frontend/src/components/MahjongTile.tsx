import React from 'react';
import { motion } from 'framer-motion';
import classNames from 'classnames';
import { Tile, tileToString, TileType } from '../types/mahjong';

export type CardBackStyle = 'classic' | 'elegant' | 'bamboo' | 'cloud' | 'traditional' | 'pure';

interface MahjongTileProps {
  tile: Tile;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  variant?: 'default' | 'selected' | 'selectedHorizontal' | 'recommended' | 'disabled' | 'disabledHorizontal' | 'back';
  onClick?: () => void;
  onDoubleClick?: () => void;
  className?: string;
  showBackground?: boolean;
  animationDelay?: number;
  seamless?: boolean;
  direction?: 'horizontal' | 'vertical';
  cardBackStyle?: CardBackStyle;
}

const MahjongTile: React.FC<MahjongTileProps> = ({
  tile,
  size = 'medium',
  variant = 'default',
  onClick,
  onDoubleClick,
  className,
  showBackground = true,
  animationDelay = 0,
  seamless = false,
  direction = 'horizontal',
  cardBackStyle = 'elegant'
}) => {
  const tileText = tileToString(tile);
  
  // 尺寸样式
  const sizeClasses = {
    tiny: 'w-6 h-8 text-xs',
    small: 'w-8 h-10 text-xs',
    medium: 'w-12 h-16 text-sm',
    large: 'w-16 h-20 text-base'
  };
  
  // 获取背面样式
  const getBackVariantClasses = (style: CardBackStyle): string => {
    const backStyles = {
      classic: 'bg-gradient-to-br from-green-600 to-green-800 border-green-700',
      elegant: 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300',
      bamboo: 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200',
      cloud: 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200',
      traditional: 'bg-gradient-to-br from-red-900 to-red-950 border-red-800',
      pure: 'bg-gray-200 border-gray-300'
    };
    return backStyles[style] + ' cursor-not-allowed';
  };
  
  // 变体样式
  const variantClasses = {
    default: 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50',
    selected: 'bg-blue-100 border-blue-400 text-blue-800 ring-2 ring-blue-300',
    selectedHorizontal: 'bg-blue-100 border-blue-400 text-blue-800 ring-2 ring-blue-300',
    recommended: 'bg-green-100 border-green-400 text-green-800 ring-2 ring-green-300 animate-pulse',
    disabled: 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed',
    disabledHorizontal: 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed',
    back: getBackVariantClasses(cardBackStyle)
  };
  
  // 花色颜色
  const getTypeColor = (tileType: TileType): string => {
    switch (tileType) {
      case TileType.WAN:
        return 'text-blue-600';
      case TileType.TIAO:
        return 'text-green-600';
      case TileType.TONG:
        return 'text-red-600';
      case TileType.ZI:
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };
  
  // 获取背面图案
  const getBackPattern = (style: CardBackStyle) => {
    switch (style) {
      case 'classic':
        return (
          <div className="relative z-10 flex flex-col items-center justify-center text-white">
            <div className="text-xs opacity-90">🀄</div>
            <div className="w-full h-0.5 bg-white/30 my-0.5"></div>
            <div className="text-xs opacity-90">🀄</div>
          </div>
        );
      case 'elegant':
        return (
          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* 纯色背景，不显示任何图案 */}
          </div>
        );
      case 'bamboo':
        return (
          <div className="relative z-10 flex flex-col items-center justify-center text-emerald-600">
            <div className="text-xs opacity-70">竹</div>
            <div className="flex space-x-0.5 my-1">
              <div className="w-0.5 h-3 bg-emerald-400/50"></div>
              <div className="w-0.5 h-3 bg-emerald-400/50"></div>
              <div className="w-0.5 h-3 bg-emerald-400/50"></div>
            </div>
            <div className="text-xs opacity-70">韵</div>
          </div>
        );
      case 'cloud':
        return (
          <div className="relative z-10 flex flex-col items-center justify-center text-slate-500">
            <div className="text-xs opacity-60">☁</div>
            <div className="w-4 h-px bg-slate-300/60 my-1"></div>
            <div className="text-xs opacity-60">☁</div>
          </div>
        );
      case 'traditional':
        return (
          <div className="relative z-10 flex flex-col items-center justify-center text-yellow-200">
            <div className="text-xs opacity-80">麻</div>
            <div className="w-3 h-0.5 bg-yellow-200/40 my-0.5"></div>
            <div className="text-xs opacity-80">将</div>
          </div>
        );
      case 'pure':
        return (
          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* 完全纯色，无任何图案 */}
          </div>
        );
      default:
        return (
          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* 纯色背景，不显示任何图案 */}
          </div>
        );
    }
  };
  
  // 根据方向和seamless属性生成边框和圆角样式
  const getSeamlessClasses = () => {
    if (!seamless) {
      return 'border-2 rounded-lg';
    }
    
    if (direction === 'horizontal') {
      // 水平方向：移除右边框，只有最后一个元素有右边框
      return 'border-2 border-r-0 last:border-r-2 rounded-none first:rounded-l-lg last:rounded-r-lg';
    } else {
      // 垂直方向：移除下边框，只有最后一个元素有下边框
      return 'border-2 border-b-0 last:border-b-2 rounded-none first:rounded-t-lg last:rounded-b-lg';
    }
  };
  
  const baseClasses = classNames(
    'relative flex items-center justify-center',
    getSeamlessClasses(),
    'cursor-pointer',
    'font-bold select-none transition-all duration-200',
    seamless ? '' : 'shadow-sm hover:shadow-md',
    sizeClasses[size],
    variantClasses[variant],
    variant === 'back' ? '' : getTypeColor(tile.type),
    {
      'active:scale-95': onClick && variant !== 'disabled' && variant !== 'back' && !seamless,
      'transform rotate-90': variant === 'selectedHorizontal' || variant === 'disabledHorizontal'
    },
    className
  );
  
  const handleClick = () => {
    if (variant !== 'disabled' && variant !== 'back' && onClick) {
      onClick();
    }
  };
  
  const handleDoubleClick = () => {
    if (variant !== 'disabled' && variant !== 'back' && onDoubleClick) {
      onDoubleClick();
    }
  };
  
  return (
    <motion.div
      className={baseClasses}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.01, 
        delay: 0,
        type: "spring",
        stiffness: 120
      }}
      whileTap={onClick && variant !== 'disabled' && variant !== 'back' ? { scale: 0.95 } : {}}
    >
      {/* 背景装饰 */}
      {showBackground && variant !== 'back' && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg" />
      )}
      
      {/* 背面图案 */}
      {variant === 'back' ? getBackPattern(cardBackStyle) : (
        /* 牌面文字 */
        <span className="relative z-10 font-black">
          {tileText}
        </span>
      )}
      
      {/* 推荐标识 */}
      {variant === 'recommended' && (
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
      
      {/* 选中标识 */}
      {variant === 'selected' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
      )}
      
      {/* 横向选中标识 */}
      {variant === 'selectedHorizontal' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-0.5 bg-white rounded-full transform rotate-90" />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MahjongTile; 