#!/usr/bin/env python3
"""
测试同步到后端的数据格式
"""

import requests
import json

def test_sync_to_backend():
    """测试同步到后端"""
    base_url = "http://localhost:8000/api/mahjong"
    
    print("🔍 测试同步到后端...")
    
    # 模拟前端发送的游戏状态数据（包含tile_count字段）
    test_game_state = {
        "game_id": "test_sync_123",
        "player_hands": {
            "0": {
                "tiles": [
                    {"type": "wan", "value": 1},
                    {"type": "wan", "value": 2},
                    {"type": "tiao", "value": 3}
                ],
                "tile_count": 3,
                "melds": []
            },
            "1": {
                "tiles": None,  # 其他玩家的手牌为null
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
    
    # 测试设置游戏状态
    try:
        response = requests.post(
            f"{base_url}/set-game-state",
            json={"game_state": test_game_state},
            timeout=10
        )
        
        print(f"📤 发送数据: {json.dumps(test_game_state, indent=2, ensure_ascii=False)}")
        print(f"📥 响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ 同步到后端成功！")
            data = response.json()
            print(f"   Success: {data.get('success')}")
            print(f"   Message: {data.get('message')}")
            return True
        else:
            print(f"❌ 同步到后端失败！")
            print(f"   响应内容: {response.text}")
            
            # 如果是422错误，尝试解析详细错误信息
            if response.status_code == 422:
                try:
                    error_data = response.json()
                    print(f"   验证错误详情: {json.dumps(error_data, indent=2, ensure_ascii=False)}")
                except:
                    pass
            return False
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False

if __name__ == "__main__":
    test_sync_to_backend() 