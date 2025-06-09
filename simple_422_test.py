#!/usr/bin/env python3
"""
简单的422错误分析 - 不需要后端运行
"""

import json
from typing import Optional, List, Dict, Any

# 模拟前端发送的数据
frontend_data = {
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

def analyze_422_potential_causes():
    """分析可能导致422错误的原因"""
    print("🔍 分析可能导致422错误的原因")
    print("=" * 60)
    
    issues = []
    
    # 检查1: actions_history字段
    actions_history = frontend_data["game_state"]["actions_history"]
    print(f"✅ actions_history类型: {type(actions_history)} (长度: {len(actions_history)})")
    
    # 检查2: player_hands中的字段
    player_hands = frontend_data["game_state"]["player_hands"]
    print(f"\n📊 player_hands分析:")
    for player_id, hand in player_hands.items():
        tiles = hand.get("tiles")
        tile_count = hand.get("tile_count")
        melds = hand.get("melds")
        
        print(f"  玩家{player_id}:")
        print(f"    tiles: {tiles} (类型: {type(tiles)})")
        print(f"    tile_count: {tile_count} (类型: {type(tile_count)})")
        print(f"    melds: {melds} (类型: {type(melds)}, 长度: {len(melds)})")
        
        # 检查潜在问题
        if tiles is None and tile_count is None:
            issues.append(f"玩家{player_id}: tiles为None且tile_count也为None")
        
        if tiles is not None and not isinstance(tiles, list):
            issues.append(f"玩家{player_id}: tiles不是列表类型")
        
        if tile_count is not None and not isinstance(tile_count, int):
            issues.append(f"玩家{player_id}: tile_count不是整数类型")
    
    # 检查3: 其他字段
    print(f"\n🎯 其他字段检查:")
    print(f"  game_id: '{frontend_data['game_state']['game_id']}' (类型: {type(frontend_data['game_state']['game_id'])})")
    print(f"  current_player: {frontend_data['game_state']['current_player']} (类型: {type(frontend_data['game_state']['current_player'])})")
    print(f"  game_started: {frontend_data['game_state']['game_started']} (类型: {type(frontend_data['game_state']['game_started'])})")
    
    # 检查4: 嵌套字典结构
    player_discarded = frontend_data["game_state"]["player_discarded_tiles"]
    print(f"\n🗑️ player_discarded_tiles:")
    for player_id, tiles in player_discarded.items():
        print(f"  玩家{player_id}: {tiles} (类型: {type(tiles)}, 长度: {len(tiles)})")
    
    print(f"\n📋 发现的潜在问题:")
    if issues:
        for i, issue in enumerate(issues, 1):
            print(f"  {i}. {issue}")
    else:
        print("  ✅ 没有发现明显的数据类型问题")
    
    return issues

def suggest_fixes():
    """建议修复方案"""
    print(f"\n💡 建议的修复方案:")
    print("1. 确保所有player_hands中的tile_count都是整数")
    print("2. 确保actions_history是空列表而不是None")
    print("3. 确保所有必需字段都存在")
    print("4. 检查字段名是否与后端模型完全匹配")
    
    print(f"\n🔧 可能的解决步骤:")
    print("1. 重启前端开发服务器: npm start")
    print("2. 清除浏览器缓存")
    print("3. 确保后端服务正在运行")
    print("4. 检查浏览器Network面板中的实际请求数据")

def main():
    print("🚨 422错误诊断工具")
    print("=" * 60)
    
    print("📤 前端发送的数据结构:")
    print(json.dumps(frontend_data, indent=2, ensure_ascii=False))
    print("\n" + "=" * 60)
    
    # 分析问题
    issues = analyze_422_potential_causes()
    
    # 提供修复建议
    suggest_fixes()
    
    print("\n" + "=" * 60)
    print("🎯 下一步调试建议:")
    print("1. 在浏览器开发者工具中查看Network面板")
    print("2. 找到失败的POST请求到/set-game-state")
    print("3. 查看请求的Payload（发送的数据）")
    print("4. 查看响应的详细错误信息")
    print("5. 将实际的错误信息告诉我，我可以进一步分析")

if __name__ == "__main__":
    main() 