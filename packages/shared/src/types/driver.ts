// 司机相关类型定义

export type DriverStatus = 'offline' | 'available' | 'busy' | 'in_trip';

export interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  avatar?: string;

  // 车辆信息
  carModel: string;
  carPlate: string;
  carColor: string;
  carType: 'economy' | 'comfort' | 'premium' | 'taxi';

  // 状态
  status: DriverStatus;
  location?: DriverLocation;

  // 评分
  rating: number;
  totalTrips: number;

  // 收入
  todayEarnings: number;
  totalEarnings: number;

  createdAt: string;
}

export interface NearbyDriver {
  id: string;
  name: string;
  location: DriverLocation;
  carModel: string;
  carPlate: string;
  rating: number;
  distance: number;
  eta: number;
}
