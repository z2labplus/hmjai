#!/usr/bin/env python3
"""测试API并获取游戏状态"""

import requests
import json

def test_game_state():
    """测试获取游戏状态"""
    url = "http://localhost:8000/api/mahjong/game-state"
    
    try:
        response = requests.get(url)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("游戏状态:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(f"错误响应: {response.text}")
            
    except Exception as e:
        print(f"请求失败: {e}")

if __name__ == "__main__":
    test_game_state() 