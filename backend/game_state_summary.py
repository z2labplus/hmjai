#!/usr/bin/env python3
"""
血战麻将游戏状态总结脚本
显示当前玩家的手牌、碰牌、杠牌和弃牌情况
"""

import requests
import json

def get_game_state():
    """获取游戏状态"""
    try:
        response = requests.get("http://localhost:8000/api/mahjong/game-state")
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        print(f"获取游戏状态失败: {e}")
        return None

def format_tile(tile):
    """格式化麻将牌显示"""
    type_map = {
        "wan": "万",
        "tiao": "条", 
        "tong": "筒"
    }
    return f"{tile['value']}{type_map.get(tile['type'], tile['type'])}"

def format_meld(meld):
    """格式化面子显示"""
    tiles_str = "、".join([format_tile(tile) for tile in meld["tiles"]])
    
    if meld["type"] == "peng":
        return f"碰牌: {tiles_str}"
    elif meld["type"] == "gang":
        gang_type_map = {
            "an_gang": "暗杠",
            "ming_gang": "直杠",
            "jia_gang": "加杠"
        }
        gang_name = gang_type_map.get(meld["gang_type"], "杠牌")
        source_info = f" (来自玩家{meld['source_player']})" if meld.get("source_player") is not None else ""
        return f"{gang_name}: {tiles_str}{source_info}"
    
    return f"{meld['type']}: {tiles_str}"

def print_player_info(player_id, player_data, player_name):
    """打印玩家信息"""
    print(f"\n🀄 {player_name}（玩家{player_id}）:")
    
    # 手牌
    tiles = player_data.get("tiles", [])
    if tiles:
        tiles_str = "、".join([format_tile(tile) for tile in tiles])
        print(f"  📋 手牌({len(tiles)}张): {tiles_str}")
    else:
        print(f"  📋 手牌: 无")
    
    # 碰牌和杠牌
    melds = player_data.get("melds", [])
    if melds:
        print(f"  🔄 面子({len(melds)}组):")
        for meld in melds:
            print(f"    • {format_meld(meld)}")
    else:
        print(f"  🔄 面子: 无")

def print_discard_info(player_discarded, player_names):
    """打印弃牌信息"""
    print(f"\n🗑️ 弃牌情况:")
    has_discards = False
    
    for player_id, discards in player_discarded.items():
        if discards:
            has_discards = True
            player_name = player_names.get(player_id, f"玩家{player_id}")
            discards_str = "、".join([format_tile(tile) for tile in discards])
            print(f"  • {player_name}: {discards_str}")
    
    if not has_discards:
        print("  • 暂无弃牌")

def main():
    """主函数"""
    print("🀄 血战麻将游戏状态总结 🀄")
    print("=" * 60)
    
    # 获取游戏状态
    result = get_game_state()
    if not result:
        print("❌ 无法获取游戏状态")
        return
    
    game_state = result.get("game_state", {})
    if not game_state:
        print("❌ 游戏状态为空")
        return
    
    # 玩家名称映射
    player_names = {
        "0": "我",
        "1": "下家", 
        "2": "对家",
        "3": "上家"
    }
    
    # 玩家手牌信息
    player_hands = game_state.get("player_hands", {})
    
    # 只显示有数据的玩家（玩家0和玩家3）
    for player_id in ["3", "0"]:  # 按照上家、我的顺序显示
        if player_id in player_hands:
            player_name = player_names.get(player_id, f"玩家{player_id}")
            player_data = player_hands[player_id]
            print_player_info(player_id, player_data, player_name)
    
    # 弃牌信息
    player_discarded = game_state.get("player_discarded_tiles", {})
    print_discard_info(player_discarded, player_names)
    
    # 游戏统计信息
    print(f"\n📊 游戏统计:")
    print(f"  • 游戏ID: {game_state.get('game_id', 'N/A')}")
    print(f"  • 当前玩家: {player_names.get(str(game_state.get('current_player', 0)), '未知')}")
    print(f"  • 测试模式: {'✅ 已启用' if game_state.get('test_mode') else '❌ 未启用'}")
    print(f"  • 剩余牌库: {len(game_state.get('tile_pool', []))}张")
    
    print("\n" + "=" * 60)
    print("✅ 所有操作已完成！请在前端界面查看效果")
    print("🌐 前端地址: http://localhost:3000")

if __name__ == "__main__":
    main() 