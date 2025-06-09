from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import List, Dict, Optional
import json
from datetime import datetime

from ..models.mahjong import (
    GameRequest, GameResponse, GameState, Tile, TileType, 
    TileOperationRequest, GameOperationResponse, GameStateRequest, 
    ResetGameResponse, GangType
)
from ..algorithms.mahjong_analyzer import MahjongAnalyzer
from ..services.game_manager import GameManager
from ..services.mahjong_game_service import MahjongGameService

router = APIRouter(tags=["mahjong"])

# 创建全局实例
analyzer = MahjongAnalyzer()
game_manager = GameManager()
game_service = MahjongGameService()


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
    """获取所有麻将牌编码信息"""
    try:
        # 生成所有可能的麻将牌
        tiles = []
        for tile_type in ["wan", "tiao", "tong"]:
            for value in range(1, 10):
                tiles.append({
                    "type": tile_type,
                    "value": value,
                    "code": f"{value}{tile_type[0]}"  # 例如：1w, 2t, 3t
                })
        
        return {
            "success": True,
            "message": "获取麻将牌信息成功",
            "tiles": tiles
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取麻将牌信息失败: {str(e)}")


# ============ 游戏操作 API ============

@router.post("/operation", response_model=GameOperationResponse)
async def perform_tile_operation(request: TileOperationRequest):
    """执行麻将牌操作（添加手牌、弃牌、碰牌、杠牌等）"""
    try:
        success, message = game_service.process_operation(request)
        
        if success:
            current_state = game_service.get_game_state()
            return GameOperationResponse(
                success=True,
                message=message,
                game_state=current_state
            )
        else:
            return GameOperationResponse(
                success=False,
                message=message
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"操作失败: {str(e)}")


@router.get("/game-state", response_model=GameOperationResponse)
async def get_current_game_state():
    """获取当前游戏状态"""
    try:
        current_state = game_service.get_game_state()
        return GameOperationResponse(
            success=True,
            message="获取游戏状态成功",
            game_state=current_state
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取游戏状态失败: {str(e)}")


@router.post("/set-game-state", response_model=GameOperationResponse)
async def set_game_state(request: GameStateRequest):
    """设置游戏状态"""
    try:
        success = game_service.set_game_state(request.game_state)
        
        if success:
            return GameOperationResponse(
                success=True,
                message="设置游戏状态成功",
                game_state=game_service.get_game_state()
            )
        else:
            return GameOperationResponse(
                success=False,
                message="设置游戏状态失败"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"设置游戏状态失败: {str(e)}")


@router.post("/reset")
async def reset_game():
    """重置游戏状态"""
    try:
        game_service.reset_game()
        current_state = game_service.get_game_state()
        
        # 广播游戏状态更新
        await game_manager.broadcast({
            "type": "game_state_update",
            "data": current_state
        })
        
        return {
            "success": True,
            "message": "游戏重置成功",
            "game_state": current_state
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重置游戏失败: {str(e)}")


# 已移除重复的 /game-state 路由，使用上面的 get_current_game_state 函数


@router.post("/discard-tile")
async def discard_tile(
    player_id: int,
    tile_type: str,
    tile_value: int
):
    """弃牌操作"""
    try:
        # 创建牌对象
        tile = Tile(type=TileType(tile_type), value=tile_value)
        
        # 创建操作请求
        request = TileOperationRequest(
            player_id=player_id,
            operation_type="discard",
            tile=tile
        )
        
        # 处理弃牌操作
        success, message = game_service.process_operation(request)
        
        if success:
            # 获取更新后的游戏状态
            current_state = game_service.get_game_state()
            
            # 广播游戏状态更新
            await game_manager.broadcast({
                "type": "game_state_update",
                "data": current_state
            })
            
            return {
                "success": True,
                "message": message,
                "game_state": current_state
            }
        else:
            return {
                "success": False,
                "message": message
            }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"弃牌失败: {str(e)}")


# ============ 便捷操作 API ============

@router.post("/add-hand-tile")
async def add_hand_tile(
    player_id: int, 
    tile_type: str, 
    tile_value: int,
    game_id: Optional[str] = None
):
    """为玩家添加手牌
    
    注意：
    - 玩家0（我）：添加具体牌面
    - 其他玩家：只增加手牌数量
    """
    try:
        tile = Tile(type=TileType(tile_type), value=tile_value)
        request = TileOperationRequest(
            player_id=player_id,
            operation_type="hand",
            tile=tile,
            game_id=game_id
        )
        
        success, message = game_service.process_operation(request)
        
        return {
            "success": success,
            "message": message,
            "tile": tile.dict() if player_id == 0 else None,  # 其他玩家不返回具体牌面
            "player_id": player_id,
            "game_id": game_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"添加手牌失败: {str(e)}")


@router.post("/add-hand-count")
async def add_hand_count(
    player_id: int,
    count: int = 1
):
    """为其他玩家增加手牌数量（不指定具体牌面）
    
    注意：
    - 只能用于其他玩家（1、2、3）
    - 玩家0（我）请使用 add-hand-tile 接口
    """
    try:
        if player_id == 0:
            raise ValueError("玩家0（我）请使用 add-hand-tile 接口添加具体牌面")
        
        if count <= 0:
            raise ValueError("数量必须大于0")
        
        # 获取当前游戏状态
        current_state = game_service.get_game_state()
        player_id_str = str(player_id)
        
        # 确保玩家存在
        if player_id_str not in current_state["player_hands"]:
            current_state["player_hands"][player_id_str] = {
                "tiles": None,
                "tile_count": 0,
                "melds": []
            }
        
        # 增加手牌数量
        current_state["player_hands"][player_id_str]["tile_count"] += count
        
        # 保存状态
        game_service.set_game_state_dict(current_state)
        
        return {
            "success": True,
            "message": f"玩家{player_id}手牌数量+{count}",
            "player_id": player_id,
            "added_count": count,
            "total_count": current_state["player_hands"][player_id_str]["tile_count"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"增加手牌数量失败: {str(e)}")


@router.post("/peng")
async def peng_tile_endpoint(
    player_id: int, 
    tile_type: str, 
    tile_value: int,
    source_player_id: Optional[int] = None
):
    """碰牌操作"""
    try:
        tile = Tile(type=TileType(tile_type), value=tile_value)
        request = TileOperationRequest(
            player_id=player_id,
            operation_type="peng",
            tile=tile,
            source_player_id=source_player_id
        )
        
        success, message = game_service.process_operation(request)
        
        return {
            "success": success,
            "message": message,
            "tile": tile.dict(),
            "player_id": player_id,
            "source_player_id": source_player_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"碰牌失败: {str(e)}")


@router.post("/gang")
async def gang_tile_endpoint(
    player_id: int,
    tile_type: str,
    tile_value: int,
    gang_type: str,  # "angang", "zhigang", "jiagang"
    source_player_id: Optional[int] = None
):
    """杠牌操作"""
    try:
        tile = Tile(type=TileType(tile_type), value=tile_value)
        
        # 转换杠牌类型
        operation_type_map = {
            "angang": "angang",
            "zhigang": "zhigang", 
            "jiagang": "jiagang"
        }
        
        if gang_type not in operation_type_map:
            raise ValueError(f"不支持的杠牌类型: {gang_type}")
        
        request = TileOperationRequest(
            player_id=player_id,
            operation_type=operation_type_map[gang_type],
            tile=tile,
            source_player_id=source_player_id
        )
        
        success, message = game_service.process_operation(request)
        
        return {
            "success": success,
            "message": message,
            "tile": tile.dict(),
            "player_id": player_id,
            "gang_type": gang_type,
            "source_player_id": source_player_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"杠牌失败: {str(e)}") 


@router.get("/health")
async def health_check():
    """健康检查"""
    try:
        return {
            "success": True,
            "message": "服务正常运行",
            "status": "healthy"
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "status": "unhealthy"
        }


@router.get("/")
async def get_api_info():
    """获取API信息"""
    return {
        "name": "血战麻将 API",
        "version": "1.0.0",
        "description": "智能血战麻将辅助分析工具API",
        "docs_url": "/docs",
        "status": "running"
    }


@router.get("/connections")
async def get_connections():
    """获取所有已连接的客户端和游戏信息"""
    try:
        # 获取所有已连接的客户端
        clients = []
        for client_id, websocket in game_manager.active_connections.items():
            client_info = {
                "client_id": client_id,
                "connected_at": datetime.now().isoformat(),  # 实际应该存储真实的连接时间
                "ip_address": websocket.client.host if hasattr(websocket, 'client') else "unknown"
            }
            clients.append(client_info)
        
        # 获取所有活跃的游戏
        games = []
        if game_service._game_state:
            game_info = {
                "game_id": game_service._game_state.get("game_id", "unknown"),
                "created_at": datetime.now().isoformat(),  # 实际应该存储真实的创建时间
                "player_count": len(game_service._game_state.get("player_hands", {})),
                "status": "active" if game_service._game_state.get("game_started", False) else "waiting"
            }
            games.append(game_info)
        
        return {
            "success": True,
            "message": "获取连接信息成功",
            "clients": clients,
            "games": games
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取连接信息失败: {str(e)}")


@router.post("/set-test-mode")
async def set_test_mode(enabled: bool = True):
    """设置测试模式（允许任意玩家进行操作，跳过回合检查）"""
    try:
        # 获取当前游戏状态
        current_state = game_service.get_game_state()
        
        # 设置测试模式
        current_state["test_mode"] = enabled
        
        # 保存状态
        success = game_service.set_game_state_dict(current_state)
        
        return {
            "success": success,
            "message": f"测试模式已{'启用' if enabled else '禁用'}",
            "test_mode": enabled
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"设置测试模式失败: {str(e)}") 