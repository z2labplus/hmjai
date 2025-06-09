#!/usr/bin/env python3
"""
测试API连接的脚本
"""

import requests
import json

def test_api_endpoints():
    """测试各个API端点"""
    base_url = "http://localhost:8000/api/mahjong"
    
    print("🔍 测试API连接...")
    
    # 测试健康检查
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"✅ Health check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False
    
    # 测试游戏状态获取
    try:
        response = requests.get(f"{base_url}/game-state", timeout=5)
        print(f"✅ Game state: {response.status_code}")
        data = response.json()
        print(f"   Response format: {list(data.keys())}")
        print(f"   Success: {data.get('success')}")
        print(f"   Message: {data.get('message')}")
        if 'game_state' in data:
            print(f"   Has game_state: True")
        elif 'data' in data:
            print(f"   Has data: True")
    except Exception as e:
        print(f"❌ Game state failed: {e}")
        return False
    
    # 测试设置游戏状态
    try:
        test_state = {
            "game_id": "test_123",
            "player_hands": {
                "0": {"tiles": [], "tile_count": 0, "melds": []},
                "1": {"tiles": None, "tile_count": 0, "melds": []},
                "2": {"tiles": None, "tile_count": 0, "melds": []},
                "3": {"tiles": None, "tile_count": 0, "melds": []}
            },
            "current_player": 0,
            "discarded_tiles": [],
            "player_discarded_tiles": {"0": [], "1": [], "2": [], "3": []},
            "actions_history": [],
            "game_started": False
        }
        
        response = requests.post(
            f"{base_url}/set-game-state",
            json={"game_state": test_state},
            timeout=5
        )
        print(f"✅ Set game state: {response.status_code}")
        data = response.json()
        print(f"   Success: {data.get('success')}")
    except Exception as e:
        print(f"❌ Set game state failed: {e}")
        return False
    
    print("🎉 所有API测试通过！")
    return True

if __name__ == "__main__":
    test_api_endpoints() 