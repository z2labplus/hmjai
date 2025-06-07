import axios from 'axios';
import { Tile } from '../types/mahjong';
import { useGameStore } from '../stores/gameStore';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/mahjong'
});

class MahjongApiClient {
  static async getGameState() {
    try {
      const response = await apiClient.get('/game-state');
      return response.data;
    } catch (error) {
      console.error('获取游戏状态失败:', error);
      throw error;
    }
  }

  static async addTileToHand(playerId: number, tile: Tile) {
    try {
      const params = new URLSearchParams({
        player_id: playerId.toString(),
        tile_type: tile.type,
        tile_value: tile.value.toString()
      });
      const response = await apiClient.post(`/add-tile?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('添加手牌失败:', error);
      throw error;
    }
  }

  static async discardTile(playerId: number, tileType: string, tileValue: number) {
    try {
      const params = new URLSearchParams({
        player_id: playerId.toString(),
        tile_type: tileType,
        tile_value: tileValue.toString()
      });
      const response = await apiClient.post(`/discard-tile?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('弃牌失败:', error);
      throw error;
    }
  }
}

export default MahjongApiClient; 