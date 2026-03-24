// 订单相关类型定义

export type OrderStatus =
  | 'pending'      // 等待接单
  | 'accepted'     // 已接单
  | 'arriving'     // 司机正在赶来
  | 'arrived'      // 司机已到达
  | 'in_progress'  // 行程中
  | 'completed'    // 已完成
  | 'cancelled';   // 已取消

export type CarType = 'economy' | 'comfort' | 'premium' | 'taxi';

export interface Location {
  lat: number;
  lng: number;
  address: string;
  name?: string;
}

export interface Order {
  id: string;
  passengerId: string;
  driverId?: string;
  status: OrderStatus;
  carType: CarType;

  // 位置信息
  pickup: Location;
  destination: Location;

  // 费用信息
  estimatedPrice: number;
  actualPrice?: number;
  distance?: number;
  duration?: number;

  // 时间信息
  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;

  // 评价
  rating?: number;
  comment?: string;
}

export interface CreateOrderRequest {
  pickup: Location;
  destination: Location;
  carType: CarType;
}

export interface OrderEstimate {
  distance: number;
  duration: number;
  price: number;
  carType: CarType;
}
