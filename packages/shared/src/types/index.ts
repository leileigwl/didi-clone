// 共享类型导出

export * from './user';
export * from './order';
export * from './driver';

// 通用类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Socket 事件类型
export interface SocketEvents {
  // 订单事件
  'order:created': Order;
  'order:accepted': { orderId: string; driver: Driver };
  'order:status': { orderId: string; status: OrderStatus };
  'order:location': { orderId: string; location: DriverLocation };
  'order:completed': Order;
  'order:cancelled': { orderId: string; reason?: string };

  // 司机事件
  'driver:location': { driverId: string; location: DriverLocation };
  'driver:status': { driverId: string; status: DriverStatus };
}

import type { Order, OrderStatus } from './order';
import type { Driver, DriverStatus, DriverLocation } from './driver';
