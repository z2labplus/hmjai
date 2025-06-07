import redis
import json
from typing import Dict, List, Optional, Tuple, Any
from copy import deepcopy
import asyncio
from datetime import datetime
import uuid  # 添加 uuid 导入

from ..models.mahjong import (
    GameState, HandTiles, Tile, TileType, Meld, MeldType, GangType, 
    PlayerAction, TileOperationRequest
)
from ..algorithms.mahjong_analyzer import MahjongAnalyzer
from ..core.config import settings


class MahjongGameService:
    """麻将游戏服务，处理所有游戏操作"""
    
    def __init__(self):
        # 初始化Redis连接
        self.redis = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )
        self.game_state_key = "mahjong:game_state"
        # 从Redis加载游戏状态，如果没有则创建新的
        self._game_state = self._load_or_create_state()
        self.analyzer = MahjongAnalyzer()
    
    def _load_or_create_state(self) -> Dict[str, Any]:
        """从Redis加载游戏状态，如果不存在则创建新的"""
        try:
            # 尝试从Redis加载
            state_json = self.redis.get(self.game_state_key)
            if state_json:
                return json.loads(state_json)
        except Exception as e:
            print(f"从Redis加载状态失败: {e}")
        
        # 如果加载失败或不存在，创建新的状态
        return self._create_initial_state()
    
    def _save_state(self):
        """保存游戏状态到Redis"""
        try:
            state_json = json.dumps(self._game_state)
            self.redis.set(self.game_state_key, state_json)
        except Exception as e:
            print(f"保存状态到Redis失败: {e}")
    
    def get_game_state(self) -> Dict[str, Any]:
        """获取当前游戏状态"""
        return self._game_state
    
    def set_game_state(self, game_state: GameState) -> bool:
        """设置游戏状态"""
        try:
            self._game_state = game_state.dict()
            self._save_state()
            return True
        except Exception as e:
            print(f"设置游戏状态失败: {e}")
            return False
    
    def set_game_state_dict(self, game_state: Dict[str, Any]) -> bool:
        """设置游戏状态（字典格式）"""
        try:
            self._game_state = game_state
            self._save_state()
            return True
        except Exception as e:
            print(f"设置游戏状态失败: {e}")
            return False
    
    def reset_game(self) -> None:
        """重置游戏状态"""
        self._game_state = self._create_initial_state()
        self._save_state()
    
    def add_tile_to_hand(self, player_id: int, tile: Tile) -> bool:
        """为玩家添加手牌"""
        try:
            player_id_str = str(player_id)
            if player_id_str not in self._game_state["player_hands"]:
                self._game_state["player_hands"][player_id_str] = {
                    "tiles": [],
                    "melds": []
                }
            
            # 添加手牌
            self._game_state["player_hands"][player_id_str]["tiles"].append({
                "type": tile.type,
                "value": tile.value
            })
            
            # 记录操作历史
            self._game_state["actions_history"].append({
                "type": "add_hand",
                "player_id": player_id,
                "tile": {
                    "type": tile.type,
                    "value": tile.value
                },
                "timestamp": datetime.now().timestamp()
            })
            
            # 保存并广播状态
            self._save_state()
            return True
        except Exception as e:
            print(f"添加手牌失败: {e}")
            return False
    
    async def _broadcast_state_update(self):
        pass  # 已废弃，无需广播
    
    async def discard_tile(self, player_id: int, tile: Tile) -> bool:
        """玩家弃牌（智能版本）"""
        try:
            # 确保玩家有手牌数据结构
            if player_id not in self._game_state["player_hands"]:
                self._game_state["player_hands"][player_id] = HandTiles(tiles=[], melds=[])
            
            hand_tiles = self._game_state["player_hands"][player_id].tiles
            
            # 检查手牌中是否有要弃的牌
            found_tile_index = None
            for i, hand_tile in enumerate(hand_tiles):
                if hand_tile.type == tile.type and hand_tile.value == tile.value:
                    found_tile_index = i
                    break
            
            # 如果手牌中没有要弃的牌，智能添加
            if found_tile_index is None:
                print(f"玩家 {player_id} 手牌中没有 {tile}，智能添加后再弃牌")
                hand_tiles.append(tile)
                found_tile_index = len(hand_tiles) - 1
            
            # 从手牌中移除
            hand_tiles.pop(found_tile_index)
            
            # 添加到弃牌池
            self._game_state["discarded_tiles"].append(tile)
            
            # 添加到玩家弃牌池
            if player_id not in self._game_state["player_discarded_tiles"]:
                self._game_state["player_discarded_tiles"][player_id] = []
            self._game_state["player_discarded_tiles"][player_id].append(tile)
            
            # 记录操作历史
            action = PlayerAction(
                player_id=player_id,
                action_type="discard",
                tiles=[tile]
            )
            self._game_state["actions_history"].append(action)
            
            # 广播状态更新
            self._save_state()
            return True
        except Exception as e:
            print(f"弃牌失败: {e}")
            return False
    
    async def peng_tile(self, player_id: int, tile: Tile, source_player_id: Optional[int] = None) -> bool:
        """碰牌操作"""
        try:
            # 创建碰牌组
            meld = Meld(
                type=MeldType.PENG,
                tiles=[tile, tile, tile],
                exposed=True,
                source_player=source_player_id
            )
            
            # 添加到玩家的melds中
            if player_id not in self._game_state["player_hands"]:
                self._game_state["player_hands"][player_id] = HandTiles(tiles=[], melds=[])
            
            self._game_state["player_hands"][player_id].melds.append(meld)
            
            # 减少手牌
            if player_id == 0:
                # "我" 碰牌：减少2张手牌
                self._reduce_hand_tiles(player_id, 2, tile)
            else:
                # 其他玩家碰牌：减少3张手牌
                self._reduce_hand_tiles(player_id, 3, tile)
            
            # 记录操作历史
            action = PlayerAction(
                player_id=player_id,
                action_type="peng",
                tiles=[tile]
            )
            self._game_state["actions_history"].append(action)
            
            # 广播状态更新
            self._save_state()
            return True
        except Exception as e:
            print(f"碰牌失败: {e}")
            return False
    
    async def gang_tile(self, player_id: int, tile: Tile, gang_type: GangType, source_player_id: Optional[int] = None) -> bool:
        """杠牌操作"""
        try:
            # 创建杠牌组
            meld = Meld(
                type=MeldType.GANG,
                tiles=[tile, tile, tile, tile],
                exposed=gang_type != GangType.AN_GANG,
                gang_type=gang_type,
                source_player=source_player_id if gang_type == GangType.MING_GANG else None
            )
            
            # 添加到玩家的melds中
            if player_id not in self._game_state["player_hands"]:
                self._game_state["player_hands"][player_id] = HandTiles(tiles=[], melds=[])
            
            self._game_state["player_hands"][player_id].melds.append(meld)
            
            # 减少手牌
            if gang_type == GangType.AN_GANG:
                # 暗杠：减少4张
                if player_id == 0:
                    self._reduce_hand_tiles(player_id, 4, tile)
                else:
                    self._reduce_hand_tiles(player_id, 4, tile)
            elif gang_type == GangType.MING_GANG:
                # 直杠
                if player_id == 0:
                    self._reduce_hand_tiles(player_id, 3, tile)  # "我"减少3张
                else:
                    self._reduce_hand_tiles(player_id, 4, tile)  # 其他玩家减少4张
            elif gang_type == GangType.JIA_GANG:
                # 加杠：减少1张
                self._reduce_hand_tiles(player_id, 1, tile)
            
            # 记录操作历史
            action = PlayerAction(
                player_id=player_id,
                action_type=f"gang_{gang_type.value}",
                tiles=[tile]
            )
            self._game_state["actions_history"].append(action)
            
            # 广播状态更新
            self._save_state()
            return True
        except Exception as e:
            print(f"杠牌失败: {e}")
            return False
    
    def _reduce_hand_tiles(self, player_id: int, count: int, preferred_tile: Optional[Tile] = None):
        """减少玩家手牌"""
        if player_id not in self._game_state["player_hands"]:
            return
        
        hand_tiles = self._game_state["player_hands"][player_id].tiles
        
        # 确保手牌足够
        while len(hand_tiles) < count:
            # 如果手牌不够，添加通用牌
            generic_tile = Tile(type=TileType.WAN, value=1)
            hand_tiles.append(generic_tile)
        
        # 减少指定数量的牌
        for _ in range(count):
            if len(hand_tiles) == 0:
                break
                
            # 优先移除指定类型的牌
            if preferred_tile:
                for i, tile in enumerate(hand_tiles):
                    if tile.type == preferred_tile.type and tile.value == preferred_tile.value:
                        hand_tiles.pop(i)
                        break
                else:
                    # 没找到指定牌，移除第一张
                    if hand_tiles:
                        hand_tiles.pop(0)
            else:
                # 移除第一张牌
                hand_tiles.pop(0)
    
    def process_operation(self, request: TileOperationRequest) -> Tuple[bool, str]:
        """处理游戏操作"""
        try:
            # 如果指定了game_id，检查是否与当前游戏匹配
            if request.game_id and self._game_state.get("game_id") != request.game_id:
                return False, f"游戏ID不匹配: {request.game_id}"

            if request.operation_type == "hand":
                # 添加手牌操作
                success = self.add_tile_to_hand(request.player_id, request.tile)
                return success, "添加手牌成功" if success else "添加手牌失败"
            elif request.operation_type == "discard":
                return self._handle_discard(request)
            elif request.operation_type == "peng":
                return self._handle_peng(request)
            elif request.operation_type in ["gang", "angang", "zhigang", "jiagang"]:
                return self._handle_gang(request)
            else:
                return False, f"不支持的操作类型: {request.operation_type}"
        except Exception as e:
            return False, str(e)
    
    def _initialize_tile_pool(self) -> List[Dict]:
        """初始化牌库（108张：万、条、筒各36张）"""
        tiles = []
        # 生成万、条、筒
        for tile_type in ["wan", "tiao", "tong"]:
            for value in range(1, 10):  # 1-9
                for _ in range(4):      # 每种4张
                    tiles.append({
                        "type": tile_type,
                        "value": value
                    })
        # 随机打乱
        import random
        random.shuffle(tiles)
        return tiles
    
    def _create_initial_state(self) -> Dict[str, Any]:
        """创建初始游戏状态"""
        return {
            "game_id": str(uuid.uuid4()),  # 添加 game_id 字段
            "player_hands": {
                "0": {"tiles": [], "melds": []},
                "1": {"tiles": [], "melds": []},
                "2": {"tiles": [], "melds": []},
                "3": {"tiles": [], "melds": []}
            },
            "discarded_tiles": [],  # 弃牌池
            "player_discarded_tiles": {
                "0": [], "1": [], "2": [], "3": []
            },  # 每个玩家的弃牌
            "actions_history": [],  # 操作历史
            "current_player": 0,  # 当前玩家
            "game_started": False,  # 游戏是否开始
            "last_action": None,  # 最后一个动作
            "tile_pool": self._initialize_tile_pool(),  # 牌池
            "test_mode": True,  # 测试模式，跳过回合检查
            "players": {  # 玩家信息
                "0": {"position": "我"},
                "1": {"position": "下家"},
                "2": {"position": "对家"},
                "3": {"position": "上家"}
            }
        }
    
    def start_game(self) -> Tuple[bool, str]:
        """开始游戏，发牌"""
        try:
            if self._game_state["game_started"]:
                return False, "游戏已经开始"
            
            # 为每个玩家发13张牌
            for player_id in range(4):
                for _ in range(13):
                    if not self._game_state["tile_pool"]:
                        return False, "牌库不足"
                    # 从牌库抽牌
                    tile = self._game_state["tile_pool"].pop()
                    # 添加到玩家手牌
                    self._game_state["player_hands"][str(player_id)]["tiles"].append(tile)
            
            self._game_state["game_started"] = True
            # 保存状态
            self._save_state()
            return True, "游戏开始，发牌完成"
            
        except Exception as e:
            return False, f"开始游戏失败: {str(e)}"
    
    def draw_tile(self, player_id: int) -> Tuple[bool, str, Optional[Dict]]:
        """摸牌"""
        try:
            if not self._game_state["game_started"]:
                return False, "游戏尚未开始", None
            
            if not self._game_state["tile_pool"]:
                return False, "牌库已空", None
            
            # 从牌库抽牌
            tile = self._game_state["tile_pool"].pop()
            # 添加到玩家手牌
            self._game_state["player_hands"][str(player_id)]["tiles"].append(tile)
            
            # 保存状态
            self._save_state()
            return True, "摸牌成功", tile
            
        except Exception as e:
            return False, f"摸牌失败: {str(e)}", None
    
    def _handle_discard(self, request: TileOperationRequest) -> Tuple[bool, str]:
        """处理弃牌操作"""
        try:
            player_id = str(request.player_id)
            
            # 检查是否是当前玩家的回合（测试模式可跳过）
            test_mode = self._game_state.get("test_mode", False)
            if not test_mode and self._game_state["current_player"] != request.player_id:
                return False, "不是该玩家的回合"
            
            # 添加弃牌到玩家的弃牌列表
            if player_id not in self._game_state["player_discarded_tiles"]:
                self._game_state["player_discarded_tiles"][player_id] = []
            
            tile_dict = request.tile.dict()
            self._game_state["player_discarded_tiles"][player_id].append(tile_dict)
            
            # 添加到全局弃牌池
            if "discarded_tiles" not in self._game_state:
                self._game_state["discarded_tiles"] = []
            self._game_state["discarded_tiles"].append(tile_dict)
            
            # 更新最后的操作
            self._game_state["last_action"] = {
                "type": "discard",
                "player": player_id,
                "tile": tile_dict,
                "timestamp": datetime.now().timestamp()
            }
            
            # 更新当前玩家（循环到下一个玩家），测试模式下可选择性跳过
            if not test_mode:
                self._game_state["current_player"] = (request.player_id + 1) % 4
            
            # 保存状态到Redis
            self._save_state()
            
            return True, "弃牌成功"
        except Exception as e:
            print(f"弃牌失败: {e}")
            return False, f"弃牌失败: {str(e)}"
    
    def _handle_peng(self, request: TileOperationRequest) -> Tuple[bool, str]:
        """处理碰牌操作"""
        try:
            player_id = str(request.player_id)
            
            # 确保玩家手牌结构存在
            if player_id not in self._game_state["player_hands"]:
                self._game_state["player_hands"][player_id] = {"tiles": [], "melds": []}
            
            # 创建碰牌组
            meld = {
                "id": str(uuid.uuid4()),
                "type": "peng",
                "tiles": [
                    request.tile.dict(),
                    request.tile.dict(),
                    request.tile.dict()
                ],
                "exposed": True,
                "gang_type": None,
                "source_player": request.source_player_id,
                "original_peng_id": None,
                "timestamp": datetime.now().timestamp()
            }
            
            # 添加到玩家的melds中
            self._game_state["player_hands"][player_id]["melds"].append(meld)
            
            # 记录操作历史
            if "actions_history" not in self._game_state:
                self._game_state["actions_history"] = []
            
            action = {
                "player_id": request.player_id,
                "action_type": "peng",
                "tiles": [request.tile.dict()],
                "timestamp": datetime.now().timestamp()
            }
            self._game_state["actions_history"].append(action)
            
            # 保存状态
            self._save_state()
            return True, "碰牌成功"
            
        except Exception as e:
            print(f"碰牌失败: {e}")
            return False, f"碰牌失败: {str(e)}"
    
    def _handle_gang(self, request: TileOperationRequest) -> Tuple[bool, str]:
        """处理杠牌操作"""
        try:
            player_id = str(request.player_id)
            
            # 确保玩家手牌结构存在
            if player_id not in self._game_state["player_hands"]:
                self._game_state["player_hands"][player_id] = {"tiles": [], "melds": []}
            
            # 根据operation_type确定杠牌类型
            gang_type_map = {
                "angang": "an_gang",
                "zhigang": "ming_gang",
                "jiagang": "jia_gang"
            }
            
            gang_type = gang_type_map.get(request.operation_type, "an_gang")
            
            # 创建杠牌组
            meld = {
                "id": str(uuid.uuid4()),
                "type": "gang",
                "tiles": [
                    request.tile.dict(),
                    request.tile.dict(),
                    request.tile.dict(),
                    request.tile.dict()
                ],
                "exposed": gang_type != "an_gang",
                "gang_type": gang_type,
                "source_player": request.source_player_id if gang_type == "ming_gang" else None,
                "original_peng_id": None,
                "timestamp": datetime.now().timestamp()
            }
            
            # 处理加杠特殊情况
            if request.operation_type == "jiagang":
                # 查找已有的碰牌
                for meld_item in self._game_state["player_hands"][player_id]["melds"]:
                    if (meld_item["type"] == "peng" and 
                        len(meld_item["tiles"]) > 0 and
                        meld_item["tiles"][0]["type"] == request.tile.type and
                        meld_item["tiles"][0]["value"] == request.tile.value):
                        # 找到对应的碰牌，记录ID并移除
                        meld["original_peng_id"] = meld_item["id"]
                        self._game_state["player_hands"][player_id]["melds"].remove(meld_item)
                        break
            
            # 添加到玩家的melds中
            self._game_state["player_hands"][player_id]["melds"].append(meld)
            
            # 记录操作历史
            if "actions_history" not in self._game_state:
                self._game_state["actions_history"] = []
            
            action = {
                "player_id": request.player_id,
                "action_type": f"gang_{gang_type}",
                "tiles": [request.tile.dict()],
                "timestamp": datetime.now().timestamp()
            }
            self._game_state["actions_history"].append(action)
            
            # 保存状态
            self._save_state()
            return True, f"杠牌成功 ({gang_type})"
            
        except Exception as e:
            print(f"杠牌失败: {e}")
            return False, f"杠牌失败: {str(e)}" 