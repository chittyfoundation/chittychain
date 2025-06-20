import { WebSocketService } from '../websocket';

let wsServiceInstance: WebSocketService | null = null;

export function setWebSocketService(service: WebSocketService) {
  wsServiceInstance = service;
}

export function getWebSocketService(): WebSocketService | null {
  return wsServiceInstance;
}