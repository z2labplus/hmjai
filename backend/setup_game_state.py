#!/usr/bin/env python3
"""
血战麻将游戏状态设置脚本（真实辅助工具版）
功能：模拟真实麻将辅助场景，只有"我"的手牌是具体已知的
设计原则：
- 玩家0（我）：完全已知的手牌和操作
- 其他玩家：只知道手牌数量和明牌操作
- 所有玩家的弃牌和明牌（碰、明杠、加杠）都是可见的
"""

import requests
import json
import time

# API基础URL
BASE_URL = "http://localhost:8000/api/mahjong"

def test_api_connection():
    """测试API连接"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ API连接正常")
            return True
        else:
            print("❌ API连接失败")
            return False
    except Exception as e:
        print(f"❌ API连接错误: {e}")
        return False

def reset_game():
    """重置游戏状态"""
    try:
        response = requests.post(f"{BASE_URL}/reset")
        if response.status_code == 200:
            print("✅ 游戏状态已重置")
            return True
        else:
            print(f"❌ 重置游戏失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 重置游戏错误: {e}")
        return False

def get_hand_info(player_id):
    """获取玩家手牌信息"""
    try:
        response = requests.get(f"{BASE_URL}/game-state")
        if response.status_code == 200:
            result = response.json()
            # 数据在game_state字段中
            game_state = result.get("game_state", {})
            if "player_hands" in game_state:
                player_hand = game_state["player_hands"].get(str(player_id), {})
                return {
                    "count": player_hand.get("tile_count", 0),
                    "tiles": player_hand.get("tiles", [] if player_id == 0 else None)
                }
            else:
                # 可能数据在data字段中
                data = result.get("data", {})
                player_hand = data.get("player_hands", {}).get(str(player_id), {})
                return {
                    "count": player_hand.get("tile_count", 0),
                    "tiles": player_hand.get("tiles", [] if player_id == 0 else None)
                }
        return {"count": 0, "tiles": None}
    except Exception as e:
        print(f"❌ 获取手牌信息错误: {e}")
        return {"count": 0, "tiles": None}

def add_my_hand_tile(tile_type, tile_value, description=""):
    """为我（玩家0）添加具体手牌"""
    try:
        params = {
            "player_id": 0,
            "tile_type": tile_type,
            "tile_value": tile_value
        }
        response = requests.post(f"{BASE_URL}/add-hand-tile", params=params)
        
        if response.status_code == 200:
            result = response.json()
            if result["success"]:
                hand_info = get_hand_info(0)
                print(f"✅ 我添加手牌 {tile_value}{tile_type} {description} (手牌总数:{hand_info['count']}张)")
                return True
            else:
                print(f"❌ 添加手牌失败: {result['message']}")
                return False
        else:
            print(f"❌ 添加手牌请求失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 添加手牌错误: {e}")
        return False

def add_other_player_hand_count(player_id, count, description=""):
    """为其他玩家增加手牌数量（不指定具体牌面）"""
    try:
        params = {
            "player_id": player_id,
            "count": count
        }
        response = requests.post(f"{BASE_URL}/add-hand-count", params=params)
        
        if response.status_code == 200:
            result = response.json()
            if result["success"]:
                print(f"✅ 玩家{player_id}手牌数量+{count} {description} (总数:{result['total_count']}张)")
                return True
            else:
                print(f"❌ 增加手牌数量失败: {result['message']}")
                return False
        else:
            print(f"❌ 增加手牌数量请求失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 增加手牌数量错误: {e}")
        return False

def add_peng(player_id, tile_type, tile_value, source_player_id=None, description=""):
    """为玩家添加碰牌"""
    try:
        # 获取操作前手牌信息
        before_info = get_hand_info(player_id)
        
        params = {
            "player_id": player_id,
            "tile_type": tile_type,
            "tile_value": tile_value
        }
        if source_player_id is not None:
            params["source_player_id"] = source_player_id
            
        response = requests.post(f"{BASE_URL}/peng", params=params)
        
        if response.status_code == 200:
            result = response.json()
            if result["success"]:
                # 获取操作后手牌信息
                after_info = get_hand_info(player_id)
                change = before_info["count"] - after_info["count"]
                
                source_info = f" (来自玩家{source_player_id})" if source_player_id is not None else ""
                player_name = "我" if player_id == 0 else f"玩家{player_id}"
                print(f"✅ {player_name}碰牌 {tile_value}{tile_type}{source_info} {description}")
                print(f"   📊 手牌变化: {before_info['count']} → {after_info['count']} (减少{change}张)")
                return True
            else:
                print(f"❌ 碰牌失败: {result['message']}")
                return False
        else:
            print(f"❌ 碰牌请求失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 碰牌错误: {e}")
        return False

def add_gang(player_id, tile_type, tile_value, gang_type, source_player_id=None, description=""):
    """为玩家添加杠牌"""
    try:
        # 获取操作前手牌信息
        before_info = get_hand_info(player_id)
        
        params = {
            "player_id": player_id,
            "tile_type": tile_type,
            "tile_value": tile_value,
            "gang_type": gang_type
        }
        if source_player_id is not None:
            params["source_player_id"] = source_player_id
            
        response = requests.post(f"{BASE_URL}/gang", params=params)
        
        if response.status_code == 200:
            result = response.json()
            if result["success"]:
                # 获取操作后手牌信息
                after_info = get_hand_info(player_id)
                change = before_info["count"] - after_info["count"]
                
                gang_type_names = {
                    "angang": "暗杠",
                    "zhigang": "直杠", 
                    "jiagang": "加杠"
                }
                gang_name = gang_type_names.get(gang_type, gang_type)
                source_info = f" (来自玩家{source_player_id})" if source_player_id is not None else ""
                player_name = "我" if player_id == 0 else f"玩家{player_id}"
                print(f"✅ {player_name}{gang_name} {tile_value}{tile_type}{source_info} {description}")
                print(f"   📊 手牌变化: {before_info['count']} → {after_info['count']} (减少{change}张)")
                return True
            else:
                print(f"❌ 杠牌失败: {result['message']}")
                return False
        else:
            print(f"❌ 杠牌请求失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 杠牌错误: {e}")
        return False

def discard_tile(player_id, tile_type, tile_value, description=""):
    """玩家弃牌"""
    try:
        before_info = get_hand_info(player_id)
        
        params = {
            "player_id": player_id,
            "tile_type": tile_type,
            "tile_value": tile_value
        }
        response = requests.post(f"{BASE_URL}/discard-tile", params=params)
        
        if response.status_code == 200:
            result = response.json()
            if result["success"]:
                after_info = get_hand_info(player_id)
                player_name = "我" if player_id == 0 else f"玩家{player_id}"
                print(f"✅ {player_name}弃牌 {tile_value}{tile_type} {description}")
                print(f"   📊 手牌变化: {before_info['count']} → {after_info['count']}")
                return True
            else:
                print(f"❌ 弃牌失败: {result['message']}")
                return False
        else:
            print(f"❌ 弃牌请求失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 弃牌错误: {e}")
        return False

def get_game_state():
    """获取当前游戏状态"""
    try:
        response = requests.get(f"{BASE_URL}/game-state")
        if response.status_code == 200:
            result = response.json()
            # 修复数据结构解析
            if "game_state" in result:
                return result["game_state"]
            elif result.get("success") and "data" in result:
                return result["data"]
            else:
                return result
        else:
            print(f"❌ 获取游戏状态请求失败: {response.text}")
            return None
    except Exception as e:
        print(f"❌ 获取游戏状态错误: {e}")
        return None

def setup_other_players():
    """设置其他玩家的手牌数量（不包含具体牌面）"""
    print("\n=== 设置其他玩家手牌数量 ===")
    
    # 为每个其他玩家分配13张手牌（不指定具体牌面）
    players_info = [
        (1, "下家"),
        (2, "对家"), 
        (3, "上家")
    ]
    
    for player_id, player_name in players_info:
        print(f"\n🎯 为{player_name}（玩家{player_id}）分配手牌...")
        if not add_other_player_hand_count(player_id, 13, f"(初始手牌)"):
            return False
        time.sleep(0.1)
    
    return True

def setup_my_tiles():
    """设置我（玩家0）的具体手牌"""
    print("\n=== 设置我（玩家0）的具体手牌 ===")
    
    # 1. 发13张初始手牌（考虑碰牌后会自动弃牌的情况）
    print("🎯 发13张初始手牌...")
    initial_hand = [
        # 为6万碰牌准备2张
        ("wan", 6), ("wan", 6),
        # 为9筒暗杠准备5张（考虑碰牌后会自动弃掉1张其他牌）
        ("tong", 9), ("tong", 9), ("tong", 9), ("tong", 9), ("tong", 9),
        # 为8筒直杠准备3张
        ("tong", 8), ("tong", 8), ("tong", 8),
        # 其他手牌补充到13张（包括要弃的牌）
        ("tong", 2), ("tong", 3), ("wan", 1)
    ]
    
    # 确保只有13张牌
    assert len(initial_hand) == 13, f"初始手牌应该是13张，实际是{len(initial_hand)}张"
    
    for i, (tile_type, tile_value) in enumerate(initial_hand, 1):
        if not add_my_hand_tile(tile_type, tile_value, f"(初始手牌 {i}/13)"):
            return False
        time.sleep(0.1)
    
    hand_info = get_hand_info(0)
    print(f"📊 初始手牌总数: {hand_info['count']} （应该是13张）")
    
    return True

def demonstrate_operations():
    """演示各种麻将操作"""
    print("\n=== 演示麻将操作 ===")
    
    # 1. 我弃牌
    print("\n🀄 我执行弃牌操作...")
    if not discard_tile(0, "tong", 3, "(弃牌测试)"):
        return False
    
    # 2. 其他玩家碰牌（明牌操作，所有人可见）
    print("\n🀄 下家执行碰牌操作...")
    if not add_peng(1, "wan", 5, 0, "(碰牌测试)"):
        return False
    
    # 3. 我执行碰牌
    print("\n🀄 我执行碰牌操作...")
    if not add_peng(0, "wan", 6, 2, "(碰牌测试)"):
        return False
    
    # 3.5. 为加杠准备：添加一张6万到手牌
    print("\n🎯 为加杠准备，添加6万...")
    if not add_my_hand_tile("wan", 6, "(为加杠准备)"):
        return False
    
    # 4. 我执行暗杠
    print("\n🀄 我执行暗杠操作...")
    if not add_gang(0, "tong", 9, "angang", None, "(暗杠测试)"):
        return False
    
    # 5. 其他玩家执行直杠（明牌操作）
    print("\n🀄 对家执行直杠操作...")
    if not add_gang(2, "tiao", 8, "zhigang", 1, "(直杠测试)"):
        return False
    
    # 6. 我执行加杠
    print("\n🀄 我执行加杠操作...")
    if not add_gang(0, "wan", 6, "jiagang", None, "(加杠测试)"):
        return False
    
    return True

def print_game_state_summary():
    """打印游戏状态摘要"""
    print("\n=== 🏆 游戏状态摘要 ===")
    game_state = get_game_state()
    
    if not game_state:
        print("❌ 无法获取游戏状态")
        return
    
    # 打印玩家手牌信息
    player_hands = game_state.get("player_hands", {})
    player_names = {
        "0": "我",
        "1": "下家", 
        "2": "对家",
        "3": "上家"
    }
    
    for player_id in ["0", "1", "2", "3"]:
        if player_id in player_hands:
            player_name = player_names[player_id]
            hand = player_hands[player_id]
            
            print(f"\n👤 {player_name}（玩家{player_id}）:")
            
            # 手牌
            tile_count = hand.get("tile_count", 0)
            if player_id == "0":
                # 我：显示具体手牌
                tiles = hand.get("tiles", [])
                if tiles:
                    tile_strs = []
                    for tile in tiles:
                        tile_strs.append(f"{tile['value']}{tile['type']}")
                    print(f"   🀫 手牌({tile_count}张): {', '.join(tile_strs)}")
                else:
                    print(f"   🀫 手牌: 无")
            else:
                # 其他玩家：只显示数量
                print(f"   🀫 手牌: {tile_count}张（具体牌面未知）")
            
            # 碰牌和杠牌（明牌，所有人可见）
            melds = hand.get("melds", [])
            if melds:
                print(f"   🀄 面子({len(melds)}组):")
                for meld in melds:
                    meld_type = meld["type"]
                    meld_tiles = meld["tiles"]
                    tile_strs = [f"{tile['value']}{tile['type']}" for tile in meld_tiles]
                    
                    if meld_type == "peng":
                        print(f"      🔸 碰牌: {', '.join(tile_strs)}")
                    elif meld_type == "gang":
                        gang_type = meld.get("gang_type", "unknown")
                        gang_names = {
                            "an_gang": "暗杠",
                            "ming_gang": "直杠",
                            "jia_gang": "加杠"
                        }
                        gang_name = gang_names.get(gang_type, gang_type)
                        if meld.get("exposed", True):
                            print(f"      🔹 {gang_name}: {', '.join(tile_strs)}")
                        else:
                            print(f"      🔒 暗杠: 具体牌面未知")
            else:
                print(f"   🀄 面子: 无")
    
    # 打印弃牌信息（所有弃牌都是可见的）
    player_discarded = game_state.get("player_discarded_tiles", {})
    for player_id in ["0", "1", "2", "3"]:
        if player_id in player_discarded and player_discarded[player_id]:
            player_name = player_names[player_id]
            discarded = player_discarded[player_id]
            tile_strs = [f"{tile['value']}{tile['type']}" for tile in discarded]
            print(f"\n🗑️ {player_name}（玩家{player_id}）弃牌: {', '.join(tile_strs)}")

def validate_logic():
    """验证真实辅助工具逻辑"""
    print("\n=== 🧪 真实辅助工具逻辑验证 ===")
    print("📜 设计原则：")
    print("✅ 我（玩家0）：完全已知的手牌和操作")
    print("✅ 其他玩家：只知道手牌数量和明牌操作")
    print("✅ 所有玩家的弃牌和明牌（碰、明杠、加杠）都是可见的")
    print("✅ 其他玩家的暗杠不可见（只有我的暗杠可见）")
    print("🎯 这样设计更符合真实麻将辅助工具的使用场景")

def main():
    """主函数"""
    print("🀄 血战麻将游戏状态设置脚本（真实辅助工具版） 🀄")
    print("=" * 60)
    
    # 显示真实辅助工具逻辑说明
    validate_logic()
    
    # 1. 测试API连接
    if not test_api_connection():
        return
    
    # 2. 重置游戏状态
    if not reset_game():
        return
    
    # 3. 设置其他玩家的手牌数量
    if not setup_other_players():
        print("❌ 设置其他玩家手牌失败")
        return
    
    # 4. 设置我的具体手牌
    if not setup_my_tiles():
        print("❌ 设置我的手牌失败")
        return
    
    # 5. 演示各种麻将操作
    if not demonstrate_operations():
        print("❌ 演示操作失败")
        return
    
    # 6. 打印最终状态
    print_game_state_summary()
    
    print("\n" + "=" * 60)
    print("🎉 真实辅助工具模拟完成！")
    print("💡 请在前端查看游戏界面以验证结果")
    print("🌐 前端地址: http://localhost:3000")
    print("\n📌 关键特性：")
    print("   - 我的手牌：具体牌面完全已知")
    print("   - 其他玩家：只知道手牌数量")
    print("   - 明牌操作：对所有人可见")
    print("   - 暗杠：只有我的暗杠可见")

if __name__ == "__main__":
    main() 