#!/usr/bin/env python3
"""
测试422错误修复
模拟前端发送的数据格式
"""

import json

def test_data_structure():
    """测试数据结构是否匹配"""
    print("🔍 测试前端数据结构...")
    
    # 模拟前端发送的数据（修复后的格式）
    frontend_data = {
        "game_state": {
            "game_id": "test_123",
            "player_hands": {
                "0": {
                    "tiles": [
                        {"type": "wan", "value": 1},
                        {"type": "wan", "value": 2}
                    ],
                    "tile_count": 2,
                    "melds": []
                },
                "1": {
                    "tiles": None,  # 其他玩家为null
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
    }
    
    print("✅ 前端数据结构:")
    print(json.dumps(frontend_data, indent=2, ensure_ascii=False))
    
    # 检查所有必需字段
    game_state = frontend_data["game_state"]
    
    # 检查顶级字段
    required_top_fields = ["game_id", "player_hands", "current_player", "discarded_tiles", "player_discarded_tiles", "actions_history", "game_started"]
    for field in required_top_fields:
        if field not in game_state:
            print(f"❌ 缺少字段: {field}")
            return False
        else:
            print(f"✅ 字段存在: {field}")
    
    # 检查player_hands字段
    for player_id, hand in game_state["player_hands"].items():
        print(f"\n检查玩家 {player_id}:")
        
        # 检查hand结构
        required_hand_fields = ["tiles", "tile_count", "melds"]
        for field in required_hand_fields:
            if field not in hand:
                print(f"  ❌ 缺少字段: {field}")
                return False
            else:
                print(f"  ✅ 字段存在: {field}")
        
        # 检查数据类型
        if player_id == "0":
            if not isinstance(hand["tiles"], list):
                print(f"  ❌ 玩家0的tiles应该是列表")
                return False
        else:
            if hand["tiles"] is not None:
                print(f"  ❌ 其他玩家的tiles应该是null")
                return False
        
        if not isinstance(hand["tile_count"], int):
            print(f"  ❌ tile_count应该是整数")
            return False
        
        if not isinstance(hand["melds"], list):
            print(f"  ❌ melds应该是列表")
            return False
    
    print("\n🎉 数据结构验证通过！")
    return True

if __name__ == "__main__":
    test_data_structure() 