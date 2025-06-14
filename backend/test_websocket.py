#!/usr/bin/env python3
"""
WebSocket连接测试脚本
用于测试麻将游戏WebSocket API的功能
"""

import asyncio
import websockets
import json
import uuid
from datetime import datetime


class WebSocketTester:
    def __init__(self, url="ws://localhost:8000/api/ws"):
        self.url = url
        self.websocket = None
        self.client_id = f"test_client_{uuid.uuid4().hex[:8]}"
        
    async def connect(self, room_id="test_room"):
        """连接到WebSocket服务器"""
        try:
            ws_url = f"{self.url}?room_id={room_id}&client_id={self.client_id}"
            print(f"🔌 连接到: {ws_url}")
            
            self.websocket = await websockets.connect(ws_url)
            print(f"✅ WebSocket连接成功: {self.client_id}")
            
            # 监听消息
            asyncio.create_task(self.listen_messages())
            
        except Exception as e:
            print(f"❌ 连接失败: {e}")
            
    async def disconnect(self):
        """断开连接"""
        if self.websocket:
            await self.websocket.close()
            print("🔌 WebSocket连接已断开")
    
    async def listen_messages(self):
        """监听服务器消息"""
        try:
            async for message in self.websocket:
                data = json.loads(message)
                await self.handle_message(data)
        except websockets.exceptions.ConnectionClosed:
            print("📡 连接已关闭")
        except Exception as e:
            print(f"❌ 消息监听错误: {e}")
    
    async def handle_message(self, data):
        """处理接收到的消息"""
        msg_type = data.get("type", "unknown")
        
        if msg_type == "system":
            print(f"🔔 系统消息: {data.get('data', {}).get('message', data)}")
        elif msg_type == "response":
            action = data.get("action", "unknown")
            success = data.get("success", False)
            message = data.get("message", "")
            print(f"📨 响应 [{action}]: {'✅' if success else '❌'} {message}")
        elif msg_type == "broadcast":
            event = data.get("event", "unknown")
            print(f"📢 广播事件 [{event}]: {data.get('data', {})}")
        elif msg_type == "error":
            print(f"❌ 错误: {data.get('message', data)}")
        else:
            print(f"📨 未知消息类型 [{msg_type}]: {data}")
    
    async def send_request(self, action, data=None, timeout=10):
        """发送请求消息"""
        if not self.websocket:
            print("❌ WebSocket未连接")
            return None
            
        request_id = f"req_{uuid.uuid4().hex[:8]}"
        message = {
            "type": "request",
            "action": action,
            "data": data or {},
            "request_id": request_id
        }
        
        try:
            await self.websocket.send(json.dumps(message))
            print(f"📤 发送请求 [{action}]: {data}")
            
            # 等待响应 (简化处理，实际应该匹配request_id)
            await asyncio.sleep(1)  # 给服务器时间处理
            
        except Exception as e:
            print(f"❌ 发送请求失败: {e}")
    
    async def test_health_check(self):
        """测试健康检查"""
        print("\n🔍 测试健康检查...")
        await self.send_request("health_check")
    
    async def test_game_state(self):
        """测试游戏状态操作"""
        print("\n🎮 测试游戏状态操作...")
        
        # 获取游戏状态
        await self.send_request("get_game_state")
        
        # 设置游戏状态
        test_game_state = {
            "game_id": "test_game",
            "player_hands": {
                "0": {"tiles": [], "tile_count": 13, "melds": []},
                "1": {"tiles": None, "tile_count": 13, "melds": []},
                "2": {"tiles": None, "tile_count": 13, "melds": []},
                "3": {"tiles": None, "tile_count": 13, "melds": []}
            },
            "player_discarded_tiles": {"0": [], "1": [], "2": [], "3": []},
            "discarded_tiles": [],
            "actions_history": [],
            "current_player": 0,
            "game_started": True
        }
        
        await self.send_request("set_game_state", {"game_state": test_game_state})
    
    async def test_player_actions(self):
        """测试玩家操作"""
        print("\n🎯 测试玩家操作...")
        
        # 添加手牌
        await self.send_request("player_action", {
            "operation_type": "hand",
            "player_id": 0,
            "tile": {"type": "wan", "value": 1}
        })
        
        # 弃牌
        await self.send_request("player_action", {
            "operation_type": "discard",
            "player_id": 0,
            "tile": {"type": "wan", "value": 1}
        })
        
        # 碰牌
        await self.send_request("player_action", {
            "operation_type": "peng",
            "player_id": 1,
            "tile": {"type": "wan", "value": 1},
            "source_player_id": 0
        })
    
    async def test_game_control(self):
        """测试游戏控制"""
        print("\n🎮 测试游戏控制...")
        
        # 重置游戏
        await self.send_request("game_control", {"control_type": "reset"})
        
        # 设置当前玩家
        await self.send_request("game_control", {
            "control_type": "set_current_player",
            "player_id": 1
        })
        
        # 下一个玩家
        await self.send_request("game_control", {"control_type": "next_player"})
    
    async def test_missing_suit(self):
        """测试定缺操作"""
        print("\n🎴 测试定缺操作...")
        
        # 设置定缺
        await self.send_request("missing_suit", {
            "action_type": "set",
            "player_id": 0,
            "missing_suit": "wan"
        })
        
        # 获取定缺
        await self.send_request("missing_suit", {"action_type": "get"})
        
        # 重置定缺
        await self.send_request("missing_suit", {"action_type": "reset"})
    
    async def test_record_operations(self):
        """测试牌谱操作"""
        print("\n📝 测试牌谱操作...")
        
        # 导出牌谱
        await self.send_request("export_record")
        
        # 导入牌谱 (简单测试数据)
        test_record = {
            "game_info": {
                "game_id": "test_import",
                "start_time": datetime.now().isoformat(),
                "player_count": 4,
                "game_mode": "xuezhan_daodi"
            },
            "players": {
                "0": {"name": "测试玩家0"},
                "1": {"name": "测试玩家1"},
                "2": {"name": "测试玩家2"},
                "3": {"name": "测试玩家3"}
            },
            "missing_suits": {"0": "wan"},
            "actions": [],
            "final_state": {
                "player_hands": {
                    "0": {"tiles": [], "tile_count": 0, "melds": []},
                    "1": {"tiles": None, "tile_count": 0, "melds": []},
                    "2": {"tiles": None, "tile_count": 0, "melds": []},
                    "3": {"tiles": None, "tile_count": 0, "melds": []}
                },
                "player_discarded_tiles": {"0": [], "1": [], "2": [], "3": []},
                "discarded_tiles": []
            }
        }
        
        await self.send_request("import_record", {"game_record": test_record})
    
    async def test_get_connections(self):
        """测试获取连接信息"""
        print("\n🔗 测试获取连接信息...")
        await self.send_request("get_connections")
    
    async def run_all_tests(self):
        """运行所有测试"""
        print(f"🚀 开始WebSocket API测试 - 客户端ID: {self.client_id}")
        print("=" * 60)
        
        try:
            # 连接
            await self.connect()
            await asyncio.sleep(1)  # 等待连接稳定
            
            # 运行各项测试
            await self.test_health_check()
            await asyncio.sleep(1)
            
            await self.test_game_state()
            await asyncio.sleep(1)
            
            await self.test_player_actions()
            await asyncio.sleep(1)
            
            await self.test_game_control()
            await asyncio.sleep(1)
            
            await self.test_missing_suit()
            await asyncio.sleep(1)
            
            await self.test_record_operations()
            await asyncio.sleep(1)
            
            await self.test_get_connections()
            await asyncio.sleep(2)
            
            print("\n" + "=" * 60)
            print("✅ 所有测试完成")
            
        except Exception as e:
            print(f"\n❌ 测试过程中出现错误: {e}")
        
        finally:
            # 断开连接
            await self.disconnect()


async def main():
    """主函数"""
    print("🀄 麻将游戏WebSocket API测试工具")
    print("确保后端服务器正在运行: python -m uvicorn app.main:app --reload")
    print()
    
    tester = WebSocketTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())