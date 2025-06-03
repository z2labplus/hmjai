# 欢乐麻将辅助工具 - 技术架构文档

## 1. 系统架构概览

### 1.1 整体架构
本项目采用前后端分离的架构模式，包含以下主要组件：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用      │    │   后端API服务   │    │   Redis缓存     │
│   (React SPA)   │◄──►│   (FastAPI)     │◄──►│   (内存数据库)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼─────┐           ┌─────▼──────┐         ┌─────▼──────┐
    │ 浏览器   │           │ 算法引擎   │         │ 会话存储   │
    │ 本地存储 │           │ 概率计算   │         │ 状态缓存   │
    └──────────┘           └────────────┘         └────────────┘
```

### 1.2 架构特点
- **前后端分离**: 前端React SPA与后端FastAPI独立部署
- **实时通信**: 支持WebSocket实时数据推送
- **状态管理**: 前端Zustand状态管理，后端Redis缓存
- **算法独立**: 麻将算法引擎模块化设计
- **扩展性**: 微服务化架构，便于横向扩展

## 2. 前端技术架构

### 2.1 技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI框架 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 3.x | 样式框架 |
| Zustand | 4.x | 状态管理 |
| Framer Motion | 10.x | 动画效果 |
| Axios | 1.x | HTTP客户端 |

### 2.2 目录结构
```
frontend/src/
├── components/           # React组件
│   ├── MahjongTile.tsx  # 麻将牌组件
│   ├── MahjongTable.tsx # 麻将桌组件
│   ├── GameBoard.tsx    # 游戏面板
│   └── AnalysisPanel.tsx# 分析面板
├── hooks/               # 自定义Hooks
│   ├── useWebSocket.ts  # WebSocket连接
│   └── useLocalStorage.ts # 本地存储
├── stores/              # Zustand状态管理
│   └── gameStore.ts     # 游戏状态
├── types/               # TypeScript类型
│   └── mahjong.ts       # 麻将相关类型
├── utils/               # 工具函数
│   ├── api.ts           # API调用
│   ├── mahjong.ts       # 麻将工具函数
│   └── constants.ts     # 常量定义
└── assets/              # 静态资源
    └── images/          # 图片资源
```

### 2.3 组件架构

#### 2.3.1 组件层次结构
```
App
├── Header (头部导航)
├── Main
│   ├── GameBoard (游戏面板)
│   │   ├── MahjongTable (麻将桌)
│   │   ├── HandTiles (手牌区)
│   │   ├── InputControls (输入控制)
│   │   └── TileSelector (牌面选择器)
│   └── AnalysisPanel (分析面板)
│       ├── Recommendations (建议)
│       ├── Probability (概率分析)
│       └── Statistics (统计信息)
└── Footer (底部信息)
```

#### 2.3.2 组件设计原则
- **单一职责**: 每个组件只负责一个功能
- **可复用性**: 通用组件抽象为独立模块
- **Props类型**: 严格的TypeScript类型定义
- **性能优化**: 使用React.memo和useMemo优化

### 2.4 状态管理架构

#### 2.4.1 Zustand Store结构
```typescript
interface GameStore {
  // 游戏状态
  gameState: GameState;
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  
  // WebSocket连接
  isConnected: boolean;
  connectionId: string | null;
  
  // 操作方法
  setGameState: (state: GameState) => void;
  addTileToHand: (playerId: number, tile: Tile) => void;
  addDiscardedTile: (tile: Tile, playerId: number) => void;
  // ... 其他方法
}
```

#### 2.4.2 状态更新流程
```
用户操作 → 组件事件 → Store Action → 状态更新 → 组件重渲染
    ↓
API调用 → 后端处理 → 响应数据 → Store更新 → UI更新
```

## 3. 后端技术架构

### 3.1 技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.11+ | 主编程语言 |
| FastAPI | 0.100+ | Web框架 |
| Pydantic | 2.x | 数据验证 |
| Redis | 7.x | 缓存数据库 |
| Uvicorn | 0.20+ | ASGI服务器 |
| WebSockets | - | 实时通信 |

### 3.2 目录结构
```
backend/
├── app/
│   ├── main.py          # 应用入口
│   ├── api/             # API路由
│   │   ├── endpoints/   # 端点实现
│   │   │   ├── game.py  # 游戏相关API
│   │   │   └── analysis.py # 分析相关API
│   │   └── router.py    # 路由配置
│   ├── core/            # 核心配置
│   │   ├── config.py    # 配置管理
│   │   └── redis.py     # Redis连接
│   ├── models/          # 数据模型
│   │   ├── game.py      # 游戏模型
│   │   └── analysis.py  # 分析模型
│   ├── services/        # 业务逻辑
│   │   ├── game_service.py    # 游戏服务
│   │   └── analysis_service.py # 分析服务
│   └── algorithms/      # 算法模块
│       ├── mahjong_engine.py  # 麻将引擎
│       ├── probability.py     # 概率计算
│       └── strategy.py        # 策略算法
├── tests/               # 测试代码
└── requirements.txt     # 依赖列表
```

### 3.3 API架构设计

#### 3.3.1 RESTful API结构
```
GET  /api/health        # 健康检查
GET  /api/tiles         # 获取牌码信息
POST /api/analysis      # 牌面分析
POST /api/game/state    # 更新游戏状态
WS   /api/ws           # WebSocket连接
```

#### 3.3.2 请求响应模型
```python
# 分析请求
class AnalysisRequest(BaseModel):
    game_state: GameState
    target_player: int = 0

# 分析响应
class AnalysisResponse(BaseModel):
    success: bool
    analysis: Optional[AnalysisResult]
    message: str
```

### 3.4 算法架构设计

#### 3.4.1 麻将引擎模块
```python
class MahjongEngine:
    def calculate_probability(self, state: GameState) -> float
    def get_discard_suggestions(self, hand: List[Tile]) -> List[Suggestion]
    def detect_winning_hands(self, tiles: List[Tile]) -> List[WinningHand]
    def calculate_remaining_tiles(self, state: GameState) -> Dict[int, int]
```

#### 3.4.2 概率计算算法
- **蒙特卡洛模拟**: 基于随机采样的概率估算
- **组合数学**: 精确的概率计算
- **动态规划**: 优化重复计算
- **启发式算法**: 快速近似解

## 4. 数据模型设计

### 4.1 核心数据结构

#### 4.1.1 麻将牌表示
```typescript
enum TileType {
  WAN = "wan",    // 万字牌
  TIAO = "tiao",  // 条子牌
  TONG = "tong",  // 筒子牌
  ZI = "zi"       // 字牌
}

interface Tile {
  type: TileType;
  value: number;  // 1-9 或 1-7(字牌)
}
```

#### 4.1.2 游戏状态模型
```typescript
interface GameState {
  player_hands: { [key: number]: HandTiles };
  discarded_tiles: Tile[];
  player_discarded_tiles: { [key: number]: Tile[] };
  remaining_tiles: Tile[];
  current_player: number;
  actions_history: PlayerAction[];
}
```

#### 4.1.3 分析结果模型
```typescript
interface AnalysisResult {
  recommended_discard?: Tile;
  discard_scores: { [key: string]: number };
  listen_tiles: Tile[];
  win_probability: number;
  remaining_tiles_count: { [key: number]: number };
  suggestions: string[];
}
```

## 5. 通信协议设计

### 5.1 HTTP API协议
- **RESTful设计**: 资源导向的API设计
- **JSON格式**: 统一使用JSON数据格式
- **状态码**: 标准HTTP状态码
- **错误处理**: 统一错误响应格式

### 5.2 WebSocket协议
- **连接管理**: 自动重连机制
- **消息格式**: JSON结构化消息
- **心跳检测**: 定期ping/pong保活
- **错误恢复**: 网络异常自动恢复

### 5.3 数据同步策略
- **实时同步**: 关键操作立即同步
- **批量同步**: 非关键数据批量更新
- **冲突解决**: Last-Write-Wins策略
- **离线支持**: 本地缓存和离线队列

## 6. 性能优化策略

### 6.1 前端优化
- **代码分割**: React.lazy和Suspense
- **虚拟化**: 大列表虚拟滚动
- **缓存策略**: 组件级和数据级缓存
- **预加载**: 资源预加载和懒加载

### 6.2 后端优化
- **算法优化**: 空间换时间，缓存计算结果
- **数据库优化**: Redis缓存热点数据
- **并发处理**: 异步编程和协程
- **资源池化**: 连接池和对象池

### 6.3 网络优化
- **HTTP/2**: 多路复用和服务器推送
- **压缩**: Gzip压缩减少传输量
- **CDN**: 静态资源CDN加速
- **缓存**: 浏览器缓存和HTTP缓存

## 7. 安全性设计

### 7.1 前端安全
- **XSS防护**: 输入验证和输出编码
- **CSRF防护**: Token验证机制
- **数据验证**: 客户端数据验证
- **HTTPS**: 强制HTTPS传输

### 7.2 后端安全
- **输入验证**: Pydantic模型验证
- **SQL注入**: 参数化查询
- **认证授权**: JWT Token机制
- **限流防护**: API请求频率限制

### 7.3 数据安全
- **敏感数据**: 不存储敏感信息
- **传输加密**: TLS加密传输
- **访问控制**: 基于角色的访问控制
- **审计日志**: 关键操作日志记录

## 8. 部署架构

### 8.1 开发环境
- **前端**: npm run dev (Vite开发服务器)
- **后端**: uvicorn --reload (热重载)
- **数据库**: 本地Redis实例
- **调试**: VS Code + 浏览器开发工具

### 8.2 生产环境
- **前端**: Nginx静态文件服务
- **后端**: Gunicorn + Uvicorn Workers
- **负载均衡**: Nginx反向代理
- **缓存**: Redis Cluster集群

### 8.3 容器化部署
```dockerfile
# 前端Docker
FROM node:18-alpine
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# 后端Docker  
FROM python:3.11-slim
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]
```

## 9. 监控和运维

### 9.1 日志管理
- **结构化日志**: JSON格式日志
- **日志级别**: ERROR/WARN/INFO/DEBUG
- **日志聚合**: ELK Stack或类似方案
- **错误追踪**: Sentry错误监控

### 9.2 性能监控
- **应用监控**: APM工具监控性能
- **资源监控**: CPU/内存/网络监控
- **用户体验**: 前端性能监控
- **告警机制**: 关键指标告警

### 9.3 健康检查
- **应用健康**: /health端点检查
- **依赖检查**: Redis连接状态
- **负载检查**: 系统负载监控
- **自动恢复**: 故障自动重启 