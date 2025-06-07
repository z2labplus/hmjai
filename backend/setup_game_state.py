#!/usr/bin/env python3
"""
血战麻将游戏状态设置脚本
功能：向上家和"我"添加各种牌型和操作
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

def enable_test_mode():
    """启用测试模式"""
    try:
        response = requests.post(f"{BASE_URL}/set-test-mode", params={"enabled": True})
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 测试模式已启用: {result['message']}")
            return True
        else:
            print(f"❌ 启用测试模式失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 启用测试模式错误: {e}")
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

def add_hand_tile(player_id, tile_type, tile_value, description=""):
    """为玩家添加手牌"""
    try:
        params = {
            "player_id": player_id,
            "tile_type": tile_type,
            "tile_value": tile_value
        }
        response = requests.post(f"{BASE_URL}/add-hand-tile", params=params)
        
        if response.status_code == 200:
            result = response.json()
            if result["success"]:
                print(f"✅ 玩家{player_id} 添加手牌 {tile_value}{tile_type} {description}")
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

def add_peng(player_id, tile_type, tile_value, source_player_id=None, description=""):
    """为玩家添加碰牌"""
    try:
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
                source_info = f" (来自玩家{source_player_id})" if source_player_id is not None else ""
                print(f"✅ 玩家{player_id} 碰牌 {tile_value}{tile_type}{source_info} {description}")
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
                gang_type_names = {
                    "angang": "暗杠",
                    "zhigang": "直杠", 
                    "jiagang": "加杠"
                }
                gang_name = gang_type_names.get(gang_type, gang_type)
                source_info = f" (来自玩家{source_player_id})" if source_player_id is not None else ""
                print(f"✅ 玩家{player_id} {gang_name} {tile_value}{tile_type}{source_info} {description}")
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
        params = {
            "player_id": player_id,
            "tile_type": tile_type,
            "tile_value": tile_value
        }
        response = requests.post(f"{BASE_URL}/discard-tile", params=params)
        
        if response.status_code == 200:
            result = response.json()
            if result["success"]:
                print(f"✅ 玩家{player_id} 弃牌 {tile_value}{tile_type} {description}")
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
            if result.get("success"):
                return result.get("data")
            else:
                # 尝试直接返回结果，有些接口可能返回格式不同
                return result
        else:
            print(f"❌ 获取游戏状态请求失败: {response.text}")
            return None
    except Exception as e:
        print(f"❌ 获取游戏状态错误: {e}")
        return None

def setup_shangjia_tiles():
    """设置上家（玩家3）的牌"""
    print("\n=== 设置上家（玩家3）的牌 ===")
    
    # 1. 添加13个手牌 (使用不同的牌)
    hand_tiles = [
        ("wan", 1), ("wan", 2), ("wan", 3), ("wan", 4), ("wan", 5),
        ("tiao", 1), ("tiao", 2), ("tiao", 3), ("tiao", 4), ("tiao", 5),
        ("tong", 1), ("tong", 2), ("tong", 3)
    ]
    
    print("添加13个手牌:")
    for i, (tile_type, tile_value) in enumerate(hand_tiles, 1):
        if not add_hand_tile(3, tile_type, tile_value, f"({i}/13)"):
            return False
        time.sleep(0.1)  # 避免请求过快
    
    # 2. 添加7条手牌
    if not add_hand_tile(3, "tiao", 7, "(额外添加)"):
        return False
    
    # 3. 添加8万的碰牌
    if not add_peng(3, "wan", 8, 0, "(碰牌)"):
        return False
    
    # 4. 添加暗杠 (使用9条)
    if not add_gang(3, "tiao", 9, "angang", None, "(暗杠)"):
        return False
    
    # 5. 添加直杠2条
    if not add_gang(3, "tiao", 2, "zhigang", 1, "(直杠)"):
        return False
    
    # 6. 添加加杠8万 (需要先有8万的碰牌，然后加杠)
    if not add_gang(3, "wan", 8, "jiagang", None, "(加杠8万)"):
        return False
    
    return True

def setup_my_tiles():
    """设置我（玩家0）的牌"""
    print("\n=== 设置我（玩家0）的牌 ===")
    
    # 1. 添加2筒的手牌
    if not add_hand_tile(0, "tong", 2, "(手牌)"):
        return False
    
    # 2. 添加3筒的弃牌
    if not discard_tile(0, "tong", 3, "(弃牌)"):
        return False
    
    # 3. 添加6万的碰牌
    if not add_peng(0, "wan", 6, 2, "(碰牌)"):
        return False
    
    # 4. 添加9筒的暗杠
    if not add_gang(0, "tong", 9, "angang", None, "(暗杠)"):
        return False
    
    # 5. 添加8筒的直杠
    if not add_gang(0, "tong", 8, "zhigang", 1, "(直杠)"):
        return False
    
    # 6. 添加6万的加杠 (基于之前的碰牌)
    if not add_gang(0, "wan", 6, "jiagang", None, "(加杠6万)"):
        return False
    
    return True

def print_game_state_summary():
    """打印游戏状态摘要"""
    print("\n=== 游戏状态摘要 ===")
    game_state = get_game_state()
    
    if not game_state:
        print("❌ 无法获取游戏状态")
        return
    
    # 打印玩家手牌信息
    player_hands = game_state.get("player_hands", {})
    for player_id in ["0", "3"]:  # 只显示玩家0和玩家3
        if player_id in player_hands:
            player_name = "我" if player_id == "0" else "上家"
            hand = player_hands[player_id]
            
            print(f"\n{player_name}（玩家{player_id}）:")
            
            # 手牌
            tiles = hand.get("tiles", [])
            if tiles:
                tile_strs = []
                for tile in tiles:
                    tile_strs.append(f"{tile['value']}{tile['type']}")
                print(f"  手牌({len(tiles)}张): {', '.join(tile_strs)}")
            
            # 碰牌和杠牌
            melds = hand.get("melds", [])
            if melds:
                print(f"  面子({len(melds)}组):")
                for meld in melds:
                    meld_type = meld["type"]
                    tiles = meld["tiles"]
                    tile_strs = [f"{tile['value']}{tile['type']}" for tile in tiles]
                    
                    if meld_type == "peng":
                        print(f"    碰牌: {', '.join(tile_strs)}")
                    elif meld_type == "gang":
                        gang_type = meld.get("gang_type", "unknown")
                        gang_names = {
                            "an_gang": "暗杠",
                            "ming_gang": "明杠",
                            "jia_gang": "加杠"
                        }
                        gang_name = gang_names.get(gang_type, gang_type)
                        print(f"    {gang_name}: {', '.join(tile_strs)}")
    
    # 打印弃牌信息
    player_discarded = game_state.get("player_discarded_tiles", {})
    for player_id in ["0", "3"]:
        if player_id in player_discarded and player_discarded[player_id]:
            player_name = "我" if player_id == "0" else "上家"
            discarded = player_discarded[player_id]
            tile_strs = [f"{tile['value']}{tile['type']}" for tile in discarded]
            print(f"\n{player_name}（玩家{player_id}）弃牌: {', '.join(tile_strs)}")

def main():
    """主函数"""
    print("🀄 血战麻将游戏状态设置脚本 🀄")
    print("=" * 50)
    
    # 1. 测试API连接
    if not test_api_connection():
        return
    
    # 2. 启用测试模式
    if not enable_test_mode():
        return
    
    # 3. 重置游戏状态
    if not reset_game():
        return
    
    # 4. 设置上家的牌
    if not setup_shangjia_tiles():
        print("❌ 设置上家牌失败")
        return
    
    # 5. 设置我的牌
    if not setup_my_tiles():
        print("❌ 设置我的牌失败")
        return
    
    # 6. 打印最终状态
    print_game_state_summary()
    
    print("\n" + "=" * 50)
    print("✅ 游戏状态设置完成！")
    print("💡 请在前端查看游戏界面以验证结果")
    print("🌐 前端地址: http://localhost:3000")

if __name__ == "__main__":
    main() 