import requests
import json
from typing import Tuple, List

# API配置
BASE_URL = "http://localhost:8000/api/mahjong"
HEADERS = {"Content-Type": "application/json"}

def reset_game() -> bool:
    """重置游戏"""
    try:
        response = requests.post(f"{BASE_URL}/reset", headers=HEADERS)
        print(f"重置牌局: {response.status_code}")
        if response.status_code == 200:
            print("✅ 牌局已重置")
            return True
        else:
            print("❌ 牌局重置失败", response.text)
            return False
    except Exception as e:
        print(f"❌ 重置游戏出错: {e}")
        return False

def add_discard(player_id: int, tile_type: str, tile_value: int) -> bool:
    """添加弃牌"""
    try:
        params = {
            "player_id": player_id,
            "tile_type": tile_type,
            "tile_value": tile_value
        }
        response = requests.post(f"{BASE_URL}/discard-tile", params=params, headers=HEADERS)
        
        print(f"添加弃牌 {tile_type}{tile_value}: HTTP {response.status_code}")
        if response.status_code == 200:
            print(f"✅ 成功为玩家{player_id}添加弃牌: {tile_type}{tile_value}")
            return True
        else:
            print(f"❌ 添加弃牌失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 添加弃牌出错: {e}")
        return False

def get_game_state() -> dict:
    """获取当前游戏状态"""
    try:
        response = requests.get(f"{BASE_URL}/game-state", headers=HEADERS)
        if response.status_code == 200:
            return response.json().get("data", {})
        else:
            print(f"❌ 获取游戏状态失败: {response.text}")
            return {}
    except Exception as e:
        print(f"❌ 获取游戏状态出错: {e}")
        return {}

def print_game_state(state: dict):
    """打印游戏状态"""
    if not state:
        print("没有游戏状态数据")
        return
    
    print("\n当前游戏状态:")
    print("-" * 40)
    
    # 打印弃牌信息
    print("\n弃牌池:")
    if "discarded_tiles" in state:
        for tile in state["discarded_tiles"]:
            print(f"  - {tile['type']}{tile['value']}")
    
    # 打印每个玩家的弃牌
    if "player_discarded_tiles" in state:
        for player_id, tiles in state["player_discarded_tiles"].items():
            print(f"\n玩家{player_id}的弃牌:")
            for tile in tiles:
                print(f"  - {tile['type']}{tile['value']}")
    
    print("-" * 40)

def main():
    """主函数"""
    # 1. 重置游戏
    if not reset_game():
        return
    
    # 2. 添加一些测试弃牌
    test_discards = [
        (3, "tong", 9),  # 上家打出9筒
        (2, "wan", 5),   # 对家打出5万
        (1, "tiao", 3),  # 下家打出3条
    ]
    
    for player_id, tile_type, tile_value in test_discards:
        if not add_discard(player_id, tile_type, tile_value):
            print(f"添加弃牌失败，停止测试")
            return
        
        # 每次添加弃牌后获取并打印游戏状态
        state = get_game_state()
        print_game_state(state)
        print("\n")

if __name__ == "__main__":
    main() 