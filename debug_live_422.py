#!/usr/bin/env python3
"""
实时调试422错误 - 启动后端并测试
"""

import subprocess
import requests
import json
import time
import threading
import sys
import os

# 添加backend路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def start_backend_server():
    """启动后端服务器"""
    try:
        print("🚀 启动后端服务器...")
        # 在backend目录下启动服务器
        process = subprocess.Popen(
            [sys.executable, "start_server.py"],
            cwd="backend",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        return process
    except Exception as e:
        print(f"❌ 启动后端服务器失败: {e}")
        return None

def wait_for_server():
    """等待服务器启动"""
    max_attempts = 30
    for i in range(max_attempts):
        try:
            response = requests.get("http://localhost:8000/api/mahjong/health", timeout=2)
            if response.status_code == 200:
                print("✅ 后端服务器启动成功!")
                return True
        except:
            pass
        
        print(f"⏳ 等待服务器启动... ({i+1}/{max_attempts})")
        time.sleep(1)
    
    print("❌ 服务器启动超时")
    return False

def test_422_error():
    """测试422错误"""
    print("🔍 开始测试422错误...")
    
    # 模拟前端发送的确切数据
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
    
    print("📤 发送数据:")
    print(json.dumps(frontend_data, indent=2, ensure_ascii=False))
    
    try:
        response = requests.post(
            "http://localhost:8000/api/mahjong/set-game-state",
            json=frontend_data,
            timeout=10
        )
        
        print(f"\n📨 响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ 请求成功!")
            print("响应数据:", json.dumps(response.json(), indent=2, ensure_ascii=False))
        elif response.status_code == 422:
            print("❌ 422错误详情:")
            try:
                error_data = response.json()
                print(json.dumps(error_data, indent=2, ensure_ascii=False))
                
                # 分析具体的验证错误
                if 'detail' in error_data:
                    print("\n🔍 具体验证错误:")
                    for i, error in enumerate(error_data['detail']):
                        print(f"\n错误 {i+1}:")
                        print(f"  字段路径: {' -> '.join(str(x) for x in error.get('loc', []))}")
                        print(f"  错误信息: {error.get('msg', 'unknown')}")
                        print(f"  错误类型: {error.get('type', 'unknown')}")
                        if 'input' in error:
                            print(f"  输入值: {repr(error['input'])}")
                        if 'ctx' in error:
                            print(f"  上下文: {error['ctx']}")
            except:
                print("无法解析422错误响应")
                print(f"原始响应: {response.text}")
        else:
            print(f"❌ 其他错误: {response.status_code}")
            print(f"响应: {response.text}")
    
    except Exception as e:
        print(f"❌ 请求异常: {e}")

def monitor_server_logs(process):
    """监控服务器日志"""
    if not process:
        return
    
    def read_stdout():
        for line in iter(process.stdout.readline, ''):
            if line:
                print(f"[SERVER] {line.strip()}")
    
    def read_stderr():
        for line in iter(process.stderr.readline, ''):
            if line:
                print(f"[ERROR] {line.strip()}")
    
    # 启动日志监控线程
    stdout_thread = threading.Thread(target=read_stdout, daemon=True)
    stderr_thread = threading.Thread(target=read_stderr, daemon=True)
    
    stdout_thread.start()
    stderr_thread.start()

def main():
    """主函数"""
    print("🧪 实时422错误调试工具")
    print("=" * 60)
    
    # 启动后端服务器
    server_process = start_backend_server()
    if not server_process:
        print("❌ 无法启动后端服务器")
        return
    
    # 监控服务器日志
    monitor_server_logs(server_process)
    
    # 等待服务器启动
    if not wait_for_server():
        print("❌ 服务器启动失败")
        server_process.terminate()
        return
    
    try:
        # 测试422错误
        test_422_error()
    
    finally:
        # 清理服务器进程
        print("\n🛑 关闭服务器...")
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()

if __name__ == "__main__":
    main() 