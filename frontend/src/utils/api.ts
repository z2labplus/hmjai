import axios from 'axios';
import { GameRequest, GameResponse, TileInfo } from '../types/mahjong';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log('API请求:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('API响应:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API响应错误:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// API服务类
export class MahjongAPI {
  /**
   * 分析游戏状态
   */
  static async analyzeGame(request: GameRequest): Promise<GameResponse> {
    try {
      const response = await api.post<GameResponse>('/api/mahjong/analyze', request);
      return response.data;
    } catch (error) {
      console.error('分析游戏失败:', error);
      throw new Error('分析游戏失败，请稍后重试');
    }
  }

  /**
   * 获取所有麻将牌信息
   */
  static async getTileCodes(): Promise<TileInfo[]> {
    try {
      const response = await api.get<{ tiles: TileInfo[] }>('/api/mahjong/tile-codes');
      return response.data.tiles;
    } catch (error) {
      console.error('获取麻将牌信息失败:', error);
      throw new Error('获取麻将牌信息失败');
    }
  }

  /**
   * 健康检查
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await api.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('健康检查失败:', error);
      return false;
    }
  }

  /**
   * 获取API信息
   */
  static async getApiInfo(): Promise<any> {
    try {
      const response = await api.get('/');
      return response.data;
    } catch (error) {
      console.error('获取API信息失败:', error);
      throw new Error('获取API信息失败');
    }
  }
}

// WebSocket连接管理
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly reconnectDelay = 3000; // 3秒后重连
  private readonly maxReconnectAttempts = 5;
  private reconnectAttempts = 0;

  constructor(
    private clientId: string,
    private onMessage: (data: any) => void,
    private onConnect: () => void,
    private onDisconnect: () => void,
    private onError: (error: Event) => void
  ) {}

  connect(): void {
    try {
      const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/mahjong/ws/${this.clientId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket连接已建立');
        this.reconnectAttempts = 0;
        this.onConnect();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('收到WebSocket消息:', data);
          this.onMessage(data);
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket连接已关闭');
        this.onDisconnect();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        this.onError(error);
      };
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
      this.onError(error as Event);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重连... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.log('达到最大重连次数，停止重连');
    }
  }

  sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket未连接，无法发送消息');
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export default api; 