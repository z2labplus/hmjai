import axios from 'axios';
import { Tile, GameState } from '../types/mahjong';
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

  static async setGameState(gameState: GameState) {
    try {
      // 详细日志输出，帮助调试
      console.log('📤 准备发送到后端的游戏状态:', JSON.stringify(gameState, null, 2));
      
      const requestData = {
        game_state: gameState
      };
      
      console.log('📤 完整请求数据:', JSON.stringify(requestData, null, 2));
      
      const response = await apiClient.post('/set-game-state', requestData);
      
      console.log('✅ 后端响应成功:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ 设置游戏状态失败:', error);
      
      // 详细错误信息
      if (error.response) {
        console.error('状态码:', error.response.status);
        console.error('响应数据:', error.response.data);
        console.error('响应头:', error.response.headers);
      } else if (error.request) {
        console.error('请求失败:', error.request);
      } else {
        console.error('错误信息:', error.message);
      }
      
      throw error;
    }
  }

  static async checkHealth() {
    try {
      const response = await apiClient.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('健康检查失败:', error);
      return false;
    }
  }
}

export default MahjongApiClient; 