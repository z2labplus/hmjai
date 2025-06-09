#!/usr/bin/env python3
"""
完整的同步流程测试 - 模拟前端同步到后端的过程
"""

import requests
import json
import time

def test_complete_sync_flow():
    """测试完整的同步流程"""
    base_url = "http://localhost:8000/api/mahjong"
    
    print("🚀 开始完整同步流程测试")
    print("=" * 60)
    
    # 步骤1：模拟前端初始状态（与frontend/src/stores/gameStore.ts中的initialGameState一致）
    frontend_initial_state = {
        "game_state": {
            "game_id": "default_game",
            "player_hands": {
                "0": {
                    "tiles": [],
                    "tile_count": 0,
                    "melds": []
                },
                "1": {
                    "tiles": None,
                    "tile_count": 0,
                    "melds": []
                },
                "2": {
                    "tiles": None,
                    "tile_count": 0,
                    "melds": []
                },
                "3": {
                    "tiles": None,
                    "tile_count": 0,
                    "melds": []
                }
            },
            "current_player": 0,
            "discarded_tiles": [],
            "player_discarded_tiles": {
                "0": [],
                "1": [],
                "2": [],
                "3": []
            },
            "actions_history": [],
            "game_started": False
        }
    }
    
    print("📤 步骤1：测试前端初始状态同步到后端")
    print("发送数据:")
    print(json.dumps(frontend_initial_state, indent=2, ensure_ascii=False))
    
    try:
        response = requests.post(
            f"{base_url}/set-game-state",
            json=frontend_initial_state,
            timeout=10
        )
        
        print(f"\n响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ 初始状态同步成功！")
            result = response.json()
            print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
        else:
            print("❌ 初始状态同步失败！")
            print(f"错误响应: {response.text}")
            
            # 分析422错误
            if response.status_code == 422:
                try:
                    error_detail = response.json()
                    print("\n🔍 详细验证错误:")
                    if 'detail' in error_detail:
                        for i, error in enumerate(error_detail['detail']):
                            print(f"\n错误 {i+1}:")
                            print(f"  字段路径: {' -> '.join(str(x) for x in error.get('loc', []))}")
                            print(f"  错误信息: {error.get('msg', 'unknown')}")
                            print(f"  错误类型: {error.get('type', 'unknown')}")
                            if 'input' in error:
                                print(f"  输入值: {error['input']}")
                except:
                    print("无法解析错误详情")
            return False
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False
    
    print("\n" + "=" * 60)
    
    # 步骤2：从后端获取状态
    print("📥 步骤2：从后端获取状态")
    try:
        get_response = requests.get(f"{base_url}/game-state")
        print(f"获取状态码: {get_response.status_code}")
        
        if get_response.status_code == 200:
            backend_state = get_response.json()
            print("✅ 后端状态获取成功")
            print("后端返回的状态:")
            print(json.dumps(backend_state, indent=2, ensure_ascii=False))
        else:
            print(f"❌ 获取后端状态失败: {get_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 获取后端状态异常: {e}")
        return False
    
    print("\n" + "=" * 60)
    
    # 步骤3：模拟添加一些牌然后再同步
    print("🎯 步骤3：模拟添加牌后同步")
    
    enhanced_state = {
        "game_state": {
            "game_id": "default_game",
            "player_hands": {
                "0": {
                    "tiles": [
                        {"type": "wan", "value": 1},
                        {"type": "tiao", "value": 2},
                        {"type": "tong", "value": 3}
                    ],
                    "tile_count": 3,
                    "melds": []
                },
                "1": {
                    "tiles": None,
                    "tile_count": 13,
                    "melds": []
                },
                "2": {
                    "tiles": None,
                    "tile_count": 13,
                    "melds": []
                },
                "3": {
                    "tiles": None,
                    "tile_count": 13,
                    "melds": []
                }
            },
            "current_player": 0,
            "discarded_tiles": [
                {"type": "wan", "value": 9}
            ],
            "player_discarded_tiles": {
                "0": [{"type": "wan", "value": 9}],
                "1": [],
                "2": [],
                "3": []
            },
            "actions_history": [
                {
                    "player_id": 0,
                    "action_type": "discard",
                    "tiles": [{"type": "wan", "value": 9}],
                    "timestamp": time.time()
                }
            ],
            "game_started": True
        }
    }
    
    print("发送增强状态:")
    print(json.dumps(enhanced_state, indent=2, ensure_ascii=False))
    
    try:
        enhanced_response = requests.post(
            f"{base_url}/set-game-state",
            json=enhanced_state,
            timeout=10
        )
        
        print(f"\n增强状态响应码: {enhanced_response.status_code}")
        
        if enhanced_response.status_code == 200:
            print("✅ 增强状态同步成功！")
            return True
        else:
            print("❌ 增强状态同步失败！")
            print(f"错误: {enhanced_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 增强状态同步异常: {e}")
        return False

def test_health_check():
    """测试健康检查"""
    base_url = "http://localhost:8000/api/mahjong"
    
    print("🏥 测试后端健康状态...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ 后端服务健康")
            return True
        else:
            print(f"❌ 后端服务异常: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 后端服务不可用: {e}")
        return False

if __name__ == "__main__":
    print("🧪 完整同步流程测试")
    print("=" * 60)
    
    # 首先检查后端健康状态
    if not test_health_check():
        print("\n❌ 后端服务不可用，请先启动后端服务")
        print("启动命令: cd backend && python start_server.py")
        exit(1)
    
    # 执行完整同步测试
    if test_complete_sync_flow():
        print("\n🎉 所有同步测试通过！前端应该可以正常同步到后端")
    else:
        print("\n❌ 同步测试失败，需要进一步调试")
    
    print("=" * 60) 