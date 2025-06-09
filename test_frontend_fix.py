#!/usr/bin/env python3
"""
测试前端修复是否成功
"""

import requests
import time
import json

def test_backend_connection():
    """测试后端连接"""
    try:
        response = requests.get("http://localhost:8000/api/mahjong/game-state")
        if response.status_code == 200:
            print("✅ 后端连接正常")
            return True
        else:
            print(f"❌ 后端连接失败，状态码: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 后端连接失败: {e}")
        return False

def test_frontend_loading():
    """测试前端是否正常加载"""
    try:
        response = requests.get("http://localhost:3000")
        if response.status_code == 200:
            print("✅ 前端页面正常加载")
            return True
        else:
            print(f"❌ 前端页面加载失败，状态码: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 前端页面访问失败: {e}")
        return False

def test_data_structure():
    """测试数据结构是否正确"""
    try:
        # 重置游戏状态
        requests.post("http://localhost:8000/api/mahjong/reset-game-state")
        
        # 设置测试数据
        test_data = {
            "player_id": 1,
            "count": 13
        }
        response = requests.post("http://localhost:8000/api/mahjong/add-hand-count", json=test_data)
        
        if response.status_code == 200:
            # 获取游戏状态
            state_response = requests.get("http://localhost:8000/api/mahjong/game-state")
            if state_response.status_code == 200:
                game_state = state_response.json()["data"]
                
                # 检查数据结构
                player_1_hand = game_state["player_hands"]["1"]
                
                if player_1_hand["tiles"] is None and player_1_hand["tile_count"] == 13:
                    print("✅ 数据结构正确：其他玩家的tiles为null，有tile_count")
                    return True
                else:
                    print(f"❌ 数据结构错误: tiles={player_1_hand['tiles']}, tile_count={player_1_hand.get('tile_count')}")
                    return False
        
        print(f"❌ API调用失败，状态码: {response.status_code}")
        return False
        
    except Exception as e:
        print(f"❌ 数据结构测试失败: {e}")
        return False

def main():
    print("🧪 开始测试前端修复...")
    print("=" * 50)
    
    # 等待服务器启动
    print("⏳ 等待服务器启动...")
    time.sleep(3)
    
    # 测试后端连接
    if not test_backend_connection():
        print("❌ 后端服务未启动，请先启动后端服务")
        return
    
    # 测试数据结构
    if not test_data_structure():
        print("❌ 数据结构测试失败")
        return
    
    # 测试前端连接
    print("⏳ 等待前端编译...")
    time.sleep(5)
    
    if not test_frontend_loading():
        print("❌ 前端服务未启动或编译失败")
        return
    
    print("=" * 50)
    print("🎉 所有测试通过！")
    print("\n📝 测试结果:")
    print("  ✅ 后端API正常工作")
    print("  ✅ 数据结构符合预期")
    print("  ✅ 前端页面正常加载")
    print("\n🌐 请访问 http://localhost:3000 查看前端界面")
    print("🔍 检查浏览器控制台是否还有错误")

if __name__ == "__main__":
    main() 