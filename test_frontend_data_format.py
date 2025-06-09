#!/usr/bin/env python3
"""
测试前端数据格式是否与后端Pydantic模型匹配
"""

import json
from pydantic import ValidationError
import sys
import os

# 添加后端路径到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from app.models.mahjong import GameState, HandTiles, Tile, TileType
    print("✅ 成功导入后端模型")
except ImportError as e:
    print(f"❌ 导入后端模型失败: {e}")
    print("请确保运行路径正确，或者后端模块可用")
    exit(1)

def test_frontend_data_format():
    """测试前端数据格式"""
    print("🔍 测试前端数据格式...")
    
    # 模拟前端发送的数据格式（根据前端stores/gameStore.ts的initialGameState）
    frontend_game_state = {
        "game_id": "",
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
    
    print("前端数据结构:")
    print(json.dumps(frontend_game_state, indent=2, ensure_ascii=False))
    
    # 测试Pydantic验证
    try:
        print("\n🧪 使用Pydantic验证数据...")
        game_state = GameState(**frontend_game_state)
        print("✅ Pydantic验证通过！")
        print(f"验证后的对象: {game_state}")
        return True
        
    except ValidationError as e:
        print("❌ Pydantic验证失败!")
        print("详细错误信息:")
        for i, error in enumerate(e.errors()):
            print(f"\n错误 {i+1}:")
            print(f"  位置: {error['loc']}")
            print(f"  错误信息: {error['msg']}")
            print(f"  错误类型: {error['type']}")
            if 'input' in error:
                print(f"  输入值: {error['input']}")
        return False
        
    except Exception as e:
        print(f"❌ 其他验证错误: {e}")
        return False

def test_with_sample_tiles():
    """测试包含示例牌的数据"""
    print("\n🎯 测试包含示例牌的数据...")
    
    # 带有实际牌的数据
    game_state_with_tiles = {
        "game_id": "test_with_tiles",
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
        "actions_history": [],
        "game_started": True
    }
    
    try:
        game_state = GameState(**game_state_with_tiles)
        print("✅ 带牌数据验证通过！")
        
        # 测试计算方法
        print(f"剩余牌数: {game_state.calculate_remaining_tiles()}")
        print(f"可见剩余牌数: {game_state.calculate_visible_remaining_tiles()}")
        
        return True
        
    except ValidationError as e:
        print("❌ 带牌数据验证失败!")
        for error in e.errors():
            print(f"错误: {error}")
        return False

def test_problematic_cases():
    """测试可能有问题的情况"""
    print("\n🔧 测试边界情况...")
    
    test_cases = [
        # 情况1: tile_count与tiles长度不匹配
        {
            "name": "tile_count与tiles长度不匹配",
            "data": {
                "game_id": "test_mismatch",
                "player_hands": {
                    "0": {
                        "tiles": [{"type": "wan", "value": 1}],  # 1张牌
                        "tile_count": 2,  # 但说有2张
                        "melds": []
                    }
                },
                "current_player": 0,
                "discarded_tiles": [],
                "player_discarded_tiles": {"0": []},
                "actions_history": [],
                "game_started": False
            }
        },
        
        # 情况2: tiles为null但tile_count未设置
        {
            "name": "tiles为null但tile_count未设置",
            "data": {
                "game_id": "test_null",
                "player_hands": {
                    "0": {
                        "tiles": None,
                        # "tile_count": 0,  # 故意不设置
                        "melds": []
                    }
                },
                "current_player": 0,
                "discarded_tiles": [],
                "player_discarded_tiles": {"0": []},
                "actions_history": [],
                "game_started": False
            }
        }
    ]
    
    for test_case in test_cases:
        print(f"\n测试: {test_case['name']}")
        try:
            game_state = GameState(**test_case['data'])
            print("✅ 验证通过（意外）")
        except ValidationError as e:
            print("❌ 验证失败（预期）")
            print(f"错误: {e.errors()[0]['msg']}")
        except Exception as e:
            print(f"❌ 其他错误: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 前端数据格式验证测试")
    print("=" * 60)
    
    success = True
    
    # 基础数据格式测试
    if not test_frontend_data_format():
        success = False
    
    # 带牌数据测试
    if not test_with_sample_tiles():
        success = False
    
    # 边界情况测试
    test_problematic_cases()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 所有关键测试通过！前端数据格式应该兼容后端")
    else:
        print("❌ 存在兼容性问题，需要进一步修复")
    print("=" * 60) 