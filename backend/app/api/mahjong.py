from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import List, Dict
import json

from ..models.mahjong import GameRequest, GameResponse, GameState, Tile, TileType
from ..algorithms.mahjong_analyzer import MahjongAnalyzer
from ..services.game_manager import GameManager

router = APIRouter(prefix="/api/mahjong", tags=["mahjong"])

# 创建全局实例
analyzer = MahjongAnalyzer()
game_manager = GameManager()


@router.post("/analyze", response_model=GameResponse)
async def analyze_game(request: GameRequest):
    """分析游戏状态并返回建议"""
    try:
        analysis = analyzer.analyze_game_state(request.game_state, request.target_player)
        
        return GameResponse(
            success=True,
            analysis=analysis,
            message="分析完成"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@router.post("/create-tile")
async def create_tile(tile_type: str, value: int):
    """创建麻将牌"""
    try:
        tile_type_enum = TileType(tile_type)
        tile = Tile(type=tile_type_enum, value=value)
        return {"success": True, "tile": tile, "code": tile.to_code()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"创建麻将牌失败: {str(e)}")


@router.get("/tile-codes")
async def get_tile_codes():
    """获取所有麻将牌编码"""
    tiles_info = []
    
    # 万 1-9
    for i in range(1, 10):
        tiles_info.append({
            "code": i,
            "type": "wan",
            "value": i,
            "display": f"{i}万"
        })
    
    # 条 11-19
    for i in range(1, 10):
        tiles_info.append({
            "code": i + 10,
            "type": "tiao", 
            "value": i,
            "display": f"{i}条"
        })
    
    # 筒 21-29
    for i in range(1, 10):
        tiles_info.append({
            "code": i + 20,
            "type": "tong",
            "value": i, 
            "display": f"{i}筒"
        })
    
    # 字牌 31-37
    zi_names = ["东", "南", "西", "北", "中", "发", "白"]
    for i, name in enumerate(zi_names, 1):
        tiles_info.append({
            "code": i + 30,
            "type": "zi",
            "value": i,
            "display": name
        })
    
    return {"tiles": tiles_info}


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket连接，用于实时游戏状态同步"""
    await websocket.accept()
    game_manager.add_client(client_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "game_state_update":
                # 处理游戏状态更新
                game_state = GameState(**message["data"])
                analysis = analyzer.analyze_game_state(game_state, message.get("player_id", 0))
                
                response = {
                    "type": "analysis_result",
                    "data": analysis.dict()
                }
                
                await websocket.send_text(json.dumps(response, ensure_ascii=False))
            
            elif message["type"] == "ping":
                # 心跳检测
                await websocket.send_text(json.dumps({"type": "pong"}))
                
    except WebSocketDisconnect:
        game_manager.remove_client(client_id)
    except Exception as e:
        print(f"WebSocket错误: {e}")
        game_manager.remove_client(client_id) 