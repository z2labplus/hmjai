#!/usr/bin/env python3
"""
调试422错误 - 精确模拟前端发送的数据
"""

import requests
import json

def debug_sync_to_backend():
    """调试同步到后端的问题"""
    base_url = "http://localhost:8000/api/mahjong"
    
    print("🔍 调试前端同步到后端的问题...")
    
    # 1. 先从后端获取当前状态
    print("\n📥 第1步：从后端获取当前游戏状态")
    try:
        get_response = requests.get(f"{base_url}/game-state", timeout=10)
        print(f"获取状态码: {get_response.status_code}")
        
        if get_response.status_code == 200:
            backend_data = get_response.json()
            print("✅ 后端当前状态获取成功")
            print(f"后端数据格式: {json.dumps(backend_data, indent=2, ensure_ascii=False)}")
            
            # 提取game_state
            if 'game_state' in backend_data:
                current_game_state = backend_data['game_state']
            elif 'data' in backend_data:
                current_game_state = backend_data['data']
            else:
                print("❌ 无法从后端响应中提取game_state")
                return False
                
        else:
            print(f"❌ 获取后端状态失败: {get_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 获取后端状态异常: {e}")
        return False
    
    # 2. 使用获取到的状态进行设置测试
    print("\n📤 第2步：将状态发送回后端")
    try:
        # 构造前端会发送的数据格式
        frontend_request = {
            "game_state": current_game_state
        }
        
        print("前端发送的数据:")
        print(json.dumps(frontend_request, indent=2, ensure_ascii=False))
        
        set_response = requests.post(
            f"{base_url}/set-game-state",
            json=frontend_request,
            timeout=10,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\n设置状态码: {set_response.status_code}")
        
        if set_response.status_code == 200:
            print("✅ 设置游戏状态成功！")
            result_data = set_response.json()
            print(f"设置结果: {json.dumps(result_data, indent=2, ensure_ascii=False)}")
            return True
        else:
            print(f"❌ 设置游戏状态失败!")
            print(f"响应内容: {set_response.text}")
            
            # 详细分析422错误
            if set_response.status_code == 422:
                try:
                    error_detail = set_response.json()
                    print(f"\n🔍 详细验证错误信息:")
                    print(json.dumps(error_detail, indent=2, ensure_ascii=False))
                    
                    # 分析具体的验证错误
                    if 'detail' in error_detail:
                        for i, error in enumerate(error_detail['detail']):
                            print(f"\n错误 {i+1}:")
                            print(f"  位置: {error.get('loc', 'unknown')}")
                            print(f"  错误信息: {error.get('msg', 'unknown')}")
                            print(f"  错误类型: {error.get('type', 'unknown')}")
                            if 'input' in error:
                                print(f"  输入值: {error['input']}")
                                
                except Exception as parse_error:
                    print(f"❌ 解析错误详情失败: {parse_error}")
            return False
            
    except Exception as e:
        print(f"❌ 设置游戏状态异常: {e}")
        return False

def test_minimal_game_state():
    """测试最小化的游戏状态数据"""
    base_url = "http://localhost:8000/api/mahjong"
    
    print("\n🧪 测试最小化游戏状态...")
    
    # 构造最小化的有效数据
    minimal_state = {
        "game_state": {
            "game_id": "test_minimal",
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
    
    try:
        response = requests.post(
            f"{base_url}/set-game-state",
            json=minimal_state,
            timeout=10
        )
        
        print(f"最小化测试状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ 最小化数据测试通过！")
            return True
        else:
            print(f"❌ 最小化数据测试失败: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 最小化测试异常: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🚨 开始调试422错误")
    print("=" * 60)
    
    # 首先测试最小化数据
    if test_minimal_game_state():
        print("\n✅ 最小化数据可以工作，问题可能在具体的数据内容")
    else:
        print("\n❌ 连最小化数据都失败，说明基础结构有问题")
    
    print("\n" + "=" * 60)
    
    # 然后测试真实的数据流
    debug_sync_to_backend() 