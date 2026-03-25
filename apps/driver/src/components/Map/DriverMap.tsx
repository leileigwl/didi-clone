/**
 * 司机端地图组件
 * 封装了司机端常用的地图功能
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  MapView,
  MapMarker,
  MapRoute,
  DriverTracker,
  type Position,
  type RouteInfo,
} from '@didi/ui';
import './DriverMap.css';

interface Order {
  id: string;
  origin: Position;
  destination: Position;
  originAddress: string;
  destinationAddress: string;
  passengerName: string;
  status: 'pending' | 'accepted' | 'arriving' | 'arrived' | 'driving' | 'completed';
}

interface DriverMapProps {
  amapKey?: string;
  securityJsCode?: string;
  driverPosition: Position;
  currentOrder?: Order;
  onOrderStatusChange?: (orderId: string, status: Order['status']) => void;
  simulateMove?: boolean;
}

const DriverMap: React.FC<DriverMapProps> = ({
  amapKey,
  securityJsCode,
  driverPosition,
  currentOrder,
  onOrderStatusChange,
  simulateMove = false,
}) => {
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routePath, setRoutePath] = useState<Position[]>([]);
  const [map, setMap] = useState<AMap.Map | null>(null);
  const [AMap, setAMap] = useState<typeof AMap | null>(null);

  // 地图加载完成
  const handleMapReady = useCallback((mapInstance: AMap.Map, AMapInstance: typeof AMap) => {
    setMap(mapInstance);
    setAMap(AMapInstance);
  }, []);

  // 规划路线
  const planRoute = useCallback(
    (origin: Position, destination: Position) => {
      if (!map || !AMap) return;

      const driving = new (AMap as any).Driving({
        policy: (AMap as any).DrivingPolicy.LEAST_TIME,
        hideMarkers: true,
        autoFitView: true,
      });

      driving.search(
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
        (status: string, result: any) => {
          if (status === 'complete' && result.routes && result.routes.length > 0) {
            const route = result.routes[0];
            const path: Position[] = [];

            route.steps.forEach((step: any) => {
              step.path.forEach((point: any) => {
                path.push({
                  lng: point.lng,
                  lat: point.lat,
                });
              });
            });

            setRoutePath(path);
            setRouteInfo({
              distance: route.distance,
              duration: route.time,
              path,
            });
          }
        }
      );
    },
    [map, AMap]
  );

  // 订单变化时规划路线
  useEffect(() => {
    if (currentOrder) {
      if (currentOrder.status === 'accepted' || currentOrder.status === 'arriving') {
        // 规划到乘客起点的路线
        planRoute(driverPosition, currentOrder.origin);
      } else if (currentOrder.status === 'driving') {
        // 规划到目的地的路线
        planRoute(currentOrder.origin, currentOrder.destination);
      }
    }
  }, [currentOrder, driverPosition, planRoute]);

  // 路线规划完成
  const handleRouteComplete = useCallback((info: RouteInfo) => {
    setRouteInfo(info);
    setRoutePath(info.path);
  }, []);

  // 获取订单状态文本
  const getStatusText = (status: Order['status']): string => {
    const statusTexts: Record<Order['status'], string> = {
      pending: '待接单',
      accepted: '已接单',
      arriving: '前往乘客',
      arrived: '已到达',
      driving: '行程中',
      completed: '已完成',
    };
    return statusTexts[status];
  };

  // 获取订单状态按钮文本
  const getStatusButtonText = (status: Order['status']): string => {
    const buttonTexts: Record<Order['status'], string> = {
      pending: '接单',
      accepted: '前往乘客',
      arriving: '到达乘客',
      arrived: '开始行程',
      driving: '结束行程',
      completed: '完成',
    };
    return buttonTexts[status];
  };

  // 更新订单状态
  const handleStatusChange = useCallback(() => {
    if (!currentOrder || !onOrderStatusChange) return;

    const statusOrder: Order['status'][] = [
      'pending',
      'accepted',
      'arriving',
      'arrived',
      'driving',
      'completed',
    ];
    const currentIndex = statusOrder.indexOf(currentOrder.status);
    const nextStatus = statusOrder[currentIndex + 1];

    if (nextStatus) {
      onOrderStatusChange(currentOrder.id, nextStatus);
    }
  }, [currentOrder, onOrderStatusChange]);

  return (
    <div className="driver-map">
      <MapView
        amapKey={amapKey}
        securityJsCode={securityJsCode}
        center={driverPosition}
        zoom={15}
        onMapReady={handleMapReady}
      >
        {/* 司机位置 */}
        <MapMarker position={driverPosition} type="driver" label="我的位置" />

        {/* 当前订单相关 */}
        {currentOrder && (
          <>
            {/* 乘客起点 */}
            {(currentOrder.status === 'accepted' ||
              currentOrder.status === 'arriving' ||
              currentOrder.status === 'arrived') && (
              <MapMarker
                position={currentOrder.origin}
                type="passenger"
                label={currentOrder.passengerName}
              />
            )}

            {/* 乘客终点 */}
            {currentOrder.status === 'driving' && (
              <MapMarker
                position={currentOrder.destination}
                type="destination"
                label="目的地"
              />
            )}

            {/* 路线 */}
            {routePath.length > 0 && (
              <MapRoute
                key={currentOrder.status === 'driving' ? 'to-destination' : 'to-pickup'}
                origin={
                  currentOrder.status === 'driving'
                    ? currentOrder.origin
                    : driverPosition
                }
                destination={
                  currentOrder.status === 'driving'
                    ? currentOrder.destination
                    : currentOrder.origin
                }
                color={currentOrder.status === 'driving' ? '#52c41a' : '#1890ff'}
                onRouteComplete={handleRouteComplete}
              />
            )}

            {/* 司机追踪（模拟模式） */}
            {simulateMove && routePath.length > 0 && (
              <DriverTracker
                driverPosition={driverPosition}
                routePath={routePath}
                autoTrack={true}
                simulateMove={true}
                moveSpeed={15}
              />
            )}
          </>
        )}
      </MapView>

      {/* 订单信息卡片 */}
      {currentOrder && (
        <div className="driver-map-order-card">
          <div className="driver-map-order-header">
            <span className="driver-map-order-status">
              {getStatusText(currentOrder.status)}
            </span>
            <span className="driver-map-order-passenger">
              {currentOrder.passengerName}
            </span>
          </div>

          {routeInfo && (
            <div className="driver-map-order-route">
              <div className="driver-map-route-item origin">
                <span className="driver-map-route-dot"></span>
                <span className="driver-map-route-text">
                  {currentOrder.originAddress}
                </span>
              </div>
              <div className="driver-map-route-line"></div>
              <div className="driver-map-route-item destination">
                <span className="driver-map-route-dot"></span>
                <span className="driver-map-route-text">
                  {currentOrder.destinationAddress}
                </span>
              </div>
            </div>
          )}

          {routeInfo && (
            <div className="driver-map-order-info">
              <span>{(routeInfo.distance / 1000).toFixed(1)} 公里</span>
              <span>约 {Math.ceil(routeInfo.duration / 60)} 分钟</span>
            </div>
          )}

          <button className="driver-map-action-btn" onClick={handleStatusChange}>
            {getStatusButtonText(currentOrder.status)}
          </button>
        </div>
      )}
    </div>
  );
};

export default DriverMap;
