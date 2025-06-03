# 欢乐麻将辅助工具 - API 文档

## 1. API 概览

### 1.1 基础信息
- **基础URL**: `http://localhost:8000/api`
- **协议**: HTTP/1.1, WebSocket
- **数据格式**: JSON
- **字符编码**: UTF-8

### 1.2 通用响应格式

#### 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  }
}
```

### 1.3 HTTP状态码
| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 2. 系统接口

### 2.1 健康检查

#### GET /health
检查服务器运行状态

**请求示例**
```bash
GET /api/health
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00Z",
    "version": "1.0.0",
    "services": {
      "redis": "connected",
      "algorithm_engine": "ready"
    }
  },
  "message": "服务运行正常"
}
```

### 2.2 获取牌码信息

#### GET /tiles
获取所有麻将牌的编码和显示信息

**请求示例**
```bash
GET /api/tiles
```

**响应示例**
```json
{
  "success": true,
  "data": [
    {
      "code": 1,
      "type": "wan",
      "value": 1,
      "display": "1万"
    },
    {
      "code": 11,
      "type": "tiao", 
      "value": 1,
      "display": "1条"
    }
  ],
  "message": "获取牌码信息成功"
}
```

## 3. 游戏状态接口

### 3.1 更新游戏状态

#### POST /game/state
更新当前游戏状态

**请求参数**
```json
{
  "player_hands": {
    "0": {
      "tiles": [
        {"type": "wan", "value": 1},
        {"type": "wan", "value": 2}
      ],
      "melds": []
    },
    "1": {"tiles": [], "melds": []},
    "2": {"tiles": [], "melds": []},
    "3": {"tiles": [], "melds": []}
  },
  "discarded_tiles": [
    {"type": "tong", "value": 5}
  ],
  "player_discarded_tiles": {
    "0": [],
    "1": [{"type": "tong", "value": 5}],
    "2": [],
    "3": []
  },
  "remaining_tiles": [],
  "current_player": 0,
  "actions_history": []
}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "state_id": "game_state_123",
    "updated_at": "2024-01-01T12:00:00Z"
  },
  "message": "游戏状态更新成功"
}
```

### 3.2 获取游戏状态

#### GET /game/state/{state_id}
根据状态ID获取游戏状态

**路径参数**
- `state_id`: 游戏状态ID

**响应示例**
```json
{
  "success": true,
  "data": {
    "state_id": "game_state_123",
    "game_state": {
      "player_hands": {},
      "discarded_tiles": [],
      "player_discarded_tiles": {},
      "remaining_tiles": [],
      "current_player": 0,
      "actions_history": []
    },
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  },
  "message": "获取游戏状态成功"
}
```

## 4. 分析接口

### 4.1 牌面分析

#### POST /analysis
对当前牌面进行智能分析

**请求参数**
```json
{
  "game_state": {
    "player_hands": {
      "0": {
        "tiles": [
          {"type": "wan", "value": 1},
          {"type": "wan", "value": 2},
          {"type": "wan", "value": 3},
          {"type": "tiao", "value": 4},
          {"type": "tiao", "value": 5},
          {"type": "tiao", "value": 6},
          {"type": "tong", "value": 7},
          {"type": "tong", "value": 8},
          {"type": "zi", "value": 1},
          {"type": "zi", "value": 1},
          {"type": "zi", "value": 2},
          {"type": "zi", "value": 2},
          {"type": "zi", "value": 3}
        ],
        "melds": []
      }
    },
    "discarded_tiles": [],
    "player_discarded_tiles": {
      "0": [],
      "1": [],
      "2": [],
      "3": []
    },
    "remaining_tiles": [],
    "current_player": 0,
    "actions_history": []
  },
  "target_player": 0,
  "analysis_options": {
    "include_probability": true,
    "include_suggestions": true,
    "include_remaining_tiles": true
  }
}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "analysis_id": "analysis_456",
    "recommended_discard": {
      "type": "zi",
      "value": 3
    },
    "discard_scores": {
      "wan_1": 75.5,
      "tong_7": 82.3,
      "zi_3": 95.1
    },
    "listen_tiles": [
      {"type": "tong", "value": 9},
      {"type": "zi", "value": 3}
    ],
    "win_probability": 0.234,
    "remaining_tiles_count": {
      "1": 3,
      "2": 4,
      "21": 2
    },
    "suggestions": [
      "建议弃掉字牌3，可以保持更多进张可能",
      "当前已听牌，需要9筒或字牌3"
    ],
    "analysis_details": {
      "current_shanten": 0,
      "winning_hands": [
        {
          "type": "common",
          "tiles_needed": [{"type": "tong", "value": 9}],
          "probability": 0.123
        }
      ]
    }
  },
  "message": "牌面分析完成"
}
```

### 4.2 批量分析

#### POST /analysis/batch
对多个牌面状态进行批量分析

**请求参数**
```json
{
  "game_states": [
    {
      "state_id": "state_1",
      "game_state": {},
      "target_player": 0
    },
    {
      "state_id": "state_2", 
      "game_state": {},
      "target_player": 0
    }
  ],
  "analysis_options": {
    "include_probability": true
  }
}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "batch_id": "batch_789",
    "results": [
      {
        "state_id": "state_1",
        "analysis": {},
        "status": "completed"
      },
      {
        "state_id": "state_2",
        "analysis": {},
        "status": "completed"
      }
    ],
    "summary": {
      "total": 2,
      "completed": 2,
      "failed": 0
    }
  },
  "message": "批量分析完成"
}
```

## 5. 实时通信接口

### 5.1 WebSocket连接

#### WS /ws
建立WebSocket连接进行实时通信

**连接URL**
```
ws://localhost:8000/api/ws?client_id=client_123
```

**查询参数**
- `client_id`: 客户端唯一标识

### 5.2 WebSocket消息格式

#### 客户端发送消息
```json
{
  "type": "game_state_update",
  "data": {
    "game_state": {},
    "request_analysis": true
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "message_id": "msg_001"
}
```

#### 服务端推送消息
```json
{
  "type": "analysis_result",
  "data": {
    "analysis": {},
    "game_state_id": "state_123"
  },
  "timestamp": "2024-01-01T12:00:01Z",
  "message_id": "msg_002"
}
```

### 5.3 WebSocket消息类型

| 消息类型 | 方向 | 说明 |
|----------|------|------|
| `connection_established` | 服务端→客户端 | 连接建立确认 |
| `game_state_update` | 客户端→服务端 | 游戏状态更新 |
| `analysis_request` | 客户端→服务端 | 请求分析 |
| `analysis_result` | 服务端→客户端 | 分析结果推送 |
| `error` | 服务端→客户端 | 错误信息 |
| `heartbeat` | 双向 | 心跳保活 |

## 6. 算法接口

### 6.1 听牌检测

#### POST /algorithm/listen-detection
检测指定手牌是否听牌

**请求参数**
```json
{
  "tiles": [
    {"type": "wan", "value": 1},
    {"type": "wan", "value": 2},
    {"type": "wan", "value": 3}
  ],
  "melds": [
    {
      "type": "peng",
      "tiles": [
        {"type": "tong", "value": 5},
        {"type": "tong", "value": 5},
        {"type": "tong", "value": 5}
      ],
      "exposed": true
    }
  ]
}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "is_listening": true,
    "shanten_count": 0,
    "listen_tiles": [
      {"type": "wan", "value": 4},
      {"type": "wan", "value": 7}
    ],
    "listen_types": [
      {
        "tile": {"type": "wan", "value": 4},
        "type": "边张",
        "probability": 0.125
      }
    ]
  },
  "message": "听牌检测完成"
}
```

### 6.2 概率计算

#### POST /algorithm/probability
计算特定情况下的胡牌概率

**请求参数**
```json
{
  "current_tiles": [],
  "discard_tile": {"type": "wan", "value": 5},
  "known_tiles": [],
  "remaining_tiles": 70,
  "calculation_method": "monte_carlo",
  "iterations": 10000
}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "win_probability": 0.234,
    "calculation_details": {
      "method": "monte_carlo",
      "iterations": 10000,
      "confidence_interval": [0.228, 0.240]
    },
    "alternative_probabilities": {
      "exact": 0.236,
      "approximation": 0.233
    }
  },
  "message": "概率计算完成"
}
```

## 7. 工具接口

### 7.1 牌型验证

#### POST /utils/validate-hand
验证手牌是否符合麻将规则

**请求参数**
```json
{
  "tiles": [
    {"type": "wan", "value": 1},
    {"type": "wan", "value": 1},
    {"type": "wan", "value": 1}
  ],
  "melds": [],
  "validation_rules": ["standard", "no_flowers"]
}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "is_valid": true,
    "total_tiles": 14,
    "violations": [],
    "suggestions": []
  },
  "message": "手牌验证完成"
}
```

### 7.2 牌面转换

#### POST /utils/convert-tiles
在不同的牌面表示格式间转换

**请求参数**
```json
{
  "source_format": "objects",
  "target_format": "codes",
  "data": [
    {"type": "wan", "value": 1},
    {"type": "tiao", "value": 5}
  ]
}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "converted_data": [1, 15],
    "source_count": 2,
    "target_count": 2
  },
  "message": "格式转换完成"
}
```

## 8. 错误码参考

### 8.1 通用错误码

| 错误码 | 说明 |
|--------|------|
| `INVALID_REQUEST` | 请求格式错误 |
| `MISSING_PARAMETER` | 缺少必需参数 |
| `INVALID_PARAMETER` | 参数值无效 |
| `INTERNAL_ERROR` | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 服务不可用 |

### 8.2 业务错误码

| 错误码 | 说明 |
|--------|------|
| `INVALID_GAME_STATE` | 游戏状态无效 |
| `INVALID_TILE` | 麻将牌无效 |
| `HAND_TOO_MANY_TILES` | 手牌数量过多 |
| `HAND_TOO_FEW_TILES` | 手牌数量过少 |
| `ANALYSIS_FAILED` | 分析计算失败 |
| `ALGORITHM_ERROR` | 算法执行错误 |

### 8.3 WebSocket错误码

| 错误码 | 说明 |
|--------|------|
| `CONNECTION_FAILED` | 连接建立失败 |
| `MESSAGE_FORMAT_ERROR` | 消息格式错误 |
| `CLIENT_NOT_FOUND` | 客户端不存在 |
| `RATE_LIMITED` | 请求频率过高 |

## 9. SDK和示例

### 9.1 JavaScript SDK示例

```javascript
// 安装: npm install mahjong-assistant-sdk

import { MahjongAPI } from 'mahjong-assistant-sdk';

const client = new MahjongAPI({
  baseURL: 'http://localhost:8000/api',
  timeout: 5000
});

// 健康检查
const health = await client.health();

// 牌面分析
const analysis = await client.analyze({
  game_state: gameState,
  target_player: 0
});

// WebSocket连接
const ws = client.connectWebSocket({
  onMessage: (data) => console.log(data),
  onError: (error) => console.error(error)
});
```

### 9.2 Python SDK示例

```python
# 安装: pip install mahjong-assistant-sdk

from mahjong_assistant import MahjongClient

client = MahjongClient(base_url='http://localhost:8000/api')

# 健康检查
health = client.health()

# 牌面分析
analysis = client.analyze(
    game_state=game_state,
    target_player=0
)

# 异步支持
import asyncio

async def main():
    async with client.websocket() as ws:
        await ws.send_json({
            'type': 'analysis_request',
            'data': {'game_state': game_state}
        })
        response = await ws.receive_json()
        print(response)
```

## 10. 测试和调试

### 10.1 API测试工具

推荐使用以下工具进行API测试：
- **Postman**: GUI界面，支持集合管理
- **curl**: 命令行工具，适合脚本化
- **HTTPie**: 用户友好的命令行工具
- **Insomnia**: 现代化的API测试工具

### 10.2 测试环境

- **开发环境**: `http://localhost:8000/api`
- **测试环境**: `http://test-api.mahjong.com/api`
- **生产环境**: `https://api.mahjong.com/api`

### 10.3 调试建议

1. **启用详细日志**: 设置`LOG_LEVEL=DEBUG`
2. **使用开发工具**: 浏览器开发者工具网络面板
3. **检查响应头**: 注意`X-Request-ID`用于错误追踪
4. **验证请求格式**: 确保Content-Type为`application/json` 