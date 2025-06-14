from fastapi import APIRouter, Depends, HTTPException, Response, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
import io

from app.models.game_record import GameRecord, GameReplay
from app.models.response import ApiResponse
from app.services.replay_service import ReplayService
from app.services.redis_service import RedisService

router = APIRouter()

async def get_replay_service():
    """获取牌谱服务实例"""
    redis_service = RedisService()
    return ReplayService(redis_service)

@router.get("/{game_id}", response_model=ApiResponse[GameReplay])
async def get_game_replay(
    game_id: str,
    replay_service: ReplayService = Depends(get_replay_service)
):
    """获取游戏牌谱"""
    try:
        replay = await replay_service.get_game_replay(game_id)
        if not replay:
            raise HTTPException(status_code=404, detail="牌谱不存在")
        
        return ApiResponse(
            success=True,
            data=replay,
            message="获取牌谱成功"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取牌谱失败: {str(e)}")

@router.get("/{game_id}/export/json")
async def export_replay_json(
    game_id: str,
    replay_service: ReplayService = Depends(get_replay_service)
):
    """导出JSON格式牌谱"""
    try:
        json_data = await replay_service.export_replay_json(game_id)
        
        return Response(
            content=json_data,
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=replay_{game_id}.json"
            }
        )
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")

@router.get("/{game_id}/export/zip")
async def export_replay_zip(
    game_id: str,
    replay_service: ReplayService = Depends(get_replay_service)
):
    """导出ZIP格式牌谱"""
    try:
        zip_data = await replay_service.export_replay_file(game_id, format="zip")
        
        return StreamingResponse(
            io.BytesIO(zip_data),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=replay_{game_id}.zip"
            }
        )
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")

@router.get("/player/{player_name}/history", response_model=ApiResponse[List[GameRecord]])
async def get_player_history(
    player_name: str,
    limit: int = Query(50, ge=1, le=100, description="返回记录数量"),
    replay_service: ReplayService = Depends(get_replay_service)
):
    """获取玩家游戏历史"""
    try:
        games = await replay_service.get_player_game_history(player_name, limit)
        
        return ApiResponse(
            success=True,
            data=games,
            message=f"获取到 {len(games)} 条游戏记录"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取历史记录失败: {str(e)}")

@router.get("/list")
async def list_recent_games(
    limit: int = Query(20, ge=1, le=100, description="返回记录数量"),
    replay_service: ReplayService = Depends(get_replay_service)
):
    """获取最近的游戏记录列表"""
    try:
        # 从Redis获取所有游戏记录的键
        game_keys = await replay_service.redis.client.keys("game_record:*")
        recent_games = []
        
        for key in game_keys[-limit:]:  # 获取最近的记录
            try:
                game_data = await replay_service.redis.client.get(key)
                if game_data:
                    game_record = GameRecord.parse_raw(game_data)
                    # 只返回基本信息，不包含详细操作
                    summary = {
                        "game_id": game_record.game_id,
                        "start_time": game_record.start_time,
                        "end_time": game_record.end_time,
                        "duration": game_record.duration,
                        "players": [p.player_name for p in game_record.players],
                        "winners": [p.player_name for p in game_record.players if p.is_winner],
                        "total_actions": game_record.total_actions
                    }
                    recent_games.append(summary)
            except:
                continue
        
        # 按开始时间排序
        recent_games.sort(key=lambda x: x["start_time"], reverse=True)
        
        return ApiResponse(
            success=True,
            data=recent_games,
            message=f"获取到 {len(recent_games)} 条游戏记录"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取游戏列表失败: {str(e)}")

@router.post("/{game_id}/share")
async def create_share_link(
    game_id: str,
    replay_service: ReplayService = Depends(get_replay_service)
):
    """创建牌谱分享链接"""
    try:
        # 验证牌谱是否存在
        replay = await replay_service.get_game_replay(game_id)
        if not replay:
            raise HTTPException(status_code=404, detail="牌谱不存在")
        
        # 创建分享链接 (这里可以实现短链接服务)
        share_link = f"/replay/{game_id}"
        
        # 可以记录分享信息到Redis
        share_key = f"share:{game_id}"
        share_data = {
            "game_id": game_id,
            "created_at": replay.replay_metadata.get("generated_at"),
            "share_count": 0
        }
        
        await replay_service.redis.client.set(
            share_key,
            str(share_data),
            ex=30*24*3600  # 30天过期
        )
        
        return ApiResponse(
            success=True,
            data={
                "share_link": share_link,
                "qr_code": f"/api/v1/replay/{game_id}/qr",  # 二维码接口
                "expires_at": "30天后"
            },
            message="分享链接创建成功"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建分享链接失败: {str(e)}")

@router.delete("/{game_id}")
async def delete_game_replay(
    game_id: str,
    replay_service: ReplayService = Depends(get_replay_service)
):
    """删除游戏牌谱"""
    try:
        # 检查牌谱是否存在
        replay = await replay_service.get_game_replay(game_id)
        if not replay:
            raise HTTPException(status_code=404, detail="牌谱不存在")
        
        # 删除Redis中的记录
        key = f"game_record:{game_id}"
        await replay_service.redis.client.delete(key)
        
        # 删除分享记录
        share_key = f"share:{game_id}"
        await replay_service.redis.client.delete(share_key)
        
        return ApiResponse(
            success=True,
            data=None,
            message="牌谱删除成功"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除牌谱失败: {str(e)}")

@router.get("/{game_id}/statistics")
async def get_game_statistics(
    game_id: str,
    replay_service: ReplayService = Depends(get_replay_service)
):
    """获取游戏统计信息"""
    try:
        replay = await replay_service.get_game_replay(game_id)
        if not replay:
            raise HTTPException(status_code=404, detail="牌谱不存在")
        
        game_record = replay.game_record
        
        # 计算统计信息
        statistics = {
            "basic_info": {
                "game_id": game_record.game_id,
                "duration": game_record.duration,
                "total_actions": game_record.total_actions,
                "winner_count": game_record.winner_count
            },
            "player_stats": [
                {
                    "player_name": p.player_name,
                    "position": p.position,
                    "final_score": p.final_score,
                    "is_winner": p.is_winner,
                    "actions": {
                        "draw": p.draw_count,
                        "discard": p.discard_count, 
                        "peng": p.peng_count,
                        "gang": p.gang_count
                    }
                }
                for p in game_record.players
            ],
            "action_distribution": {},
            "timeline": []
        }
        
        # 统计操作分布
        action_counts = {}
        for action in game_record.actions:
            action_type = action.action_type
            action_counts[action_type] = action_counts.get(action_type, 0) + 1
        
        statistics["action_distribution"] = action_counts
        
        # 构建时间线 (关键操作)
        key_actions = [action for action in game_record.actions 
                      if action.action_type in ['peng', 'gang', 'hu', 'missing_suit']]
        
        statistics["timeline"] = [
            {
                "sequence": action.sequence,
                "timestamp": action.timestamp.isoformat(),
                "player_id": action.player_id,
                "action_type": action.action_type,
                "description": f"玩家{action.player_id+1} {action.action_type}"
            }
            for action in key_actions
        ]
        
        return ApiResponse(
            success=True,
            data=statistics,
            message="获取统计信息成功"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}") 