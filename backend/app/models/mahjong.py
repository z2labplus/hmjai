from enum import Enum
from typing import List, Optional, Dict, Set
from pydantic import BaseModel, Field


class TileType(Enum):
    """麻将牌类型"""
    WAN = "wan"      # 万
    TIAO = "tiao"    # 条
    TONG = "tong"    # 筒
    ZI = "zi"        # 字牌


class Tile(BaseModel):
    """麻将牌"""
    type: TileType
    value: int = Field(..., ge=1, le=9)  # 1-9
    
    def __str__(self):
        return f"{self.value}{self.type.value}"
    
    @classmethod
    def from_code(cls, code: int) -> "Tile":
        """从数字编码创建麻将牌"""
        if 1 <= code <= 9:
            return cls(type=TileType.WAN, value=code)
        elif 11 <= code <= 19:
            return cls(type=TileType.TIAO, value=code - 10)
        elif 21 <= code <= 29:
            return cls(type=TileType.TONG, value=code - 20)
        elif 31 <= code <= 37:
            return cls(type=TileType.ZI, value=code - 30)
        else:
            raise ValueError(f"Invalid tile code: {code}")
    
    def to_code(self) -> int:
        """转换为数字编码"""
        if self.type == TileType.WAN:
            return self.value
        elif self.type == TileType.TIAO:
            return self.value + 10
        elif self.type == TileType.TONG:
            return self.value + 20
        elif self.type == TileType.ZI:
            return self.value + 30


class MeldType(Enum):
    """组合类型"""
    PENG = "peng"    # 碰
    GANG = "gang"    # 杠
    CHI = "chi"      # 吃


class Meld(BaseModel):
    """牌组合（碰、杠、吃）"""
    type: MeldType
    tiles: List[Tile]
    exposed: bool = True  # 是否明牌


class HandTiles(BaseModel):
    """手牌"""
    tiles: List[Tile] = []
    melds: List[Meld] = []
    
    def tile_count(self) -> int:
        """总牌数"""
        return len(self.tiles) + sum(len(meld.tiles) for meld in self.melds)


class PlayerAction(BaseModel):
    """玩家动作"""
    player_id: int
    action_type: str  # "draw", "discard", "peng", "gang", "chi"
    tiles: List[Tile]
    timestamp: Optional[float] = None


class GameState(BaseModel):
    """游戏状态"""
    player_hands: Dict[int, HandTiles] = {}  # 玩家手牌
    discarded_tiles: List[Tile] = []         # 弃牌池
    remaining_tiles: List[Tile] = []         # 剩余牌
    current_player: int = 0
    actions_history: List[PlayerAction] = []
    
    def get_visible_tiles(self) -> List[Tile]:
        """获取所有可见的牌"""
        visible = []
        visible.extend(self.discarded_tiles)
        
        for hand in self.player_hands.values():
            for meld in hand.melds:
                if meld.exposed:
                    visible.extend(meld.tiles)
        
        return visible
    
    def calculate_remaining_tiles(self) -> Dict[int, int]:
        """计算剩余牌数量"""
        # 初始化所有牌的数量（每种牌4张）
        all_tiles = {}
        for code in range(1, 10):  # 万
            all_tiles[code] = 4
        for code in range(11, 20):  # 条
            all_tiles[code] = 4
        for code in range(21, 30):  # 筒
            all_tiles[code] = 4
        for code in range(31, 38):  # 字牌
            all_tiles[code] = 4
        
        # 减去已知的牌
        visible_tiles = self.get_visible_tiles()
        for hand in self.player_hands.values():
            visible_tiles.extend(hand.tiles)
        
        for tile in visible_tiles:
            code = tile.to_code()
            if code in all_tiles:
                all_tiles[code] = max(0, all_tiles[code] - 1)
        
        return all_tiles


class AnalysisResult(BaseModel):
    """分析结果"""
    recommended_discard: Optional[Tile] = None
    discard_scores: Dict[str, float] = {}
    listen_tiles: List[Tile] = []
    win_probability: float = 0.0
    remaining_tiles_count: Dict[int, int] = {}
    suggestions: List[str] = []


class GameRequest(BaseModel):
    """游戏请求"""
    game_state: GameState
    target_player: int = 0  # 目标玩家ID（通常是自己）


class GameResponse(BaseModel):
    """游戏响应"""
    success: bool
    analysis: Optional[AnalysisResult] = None
    message: str = "" 