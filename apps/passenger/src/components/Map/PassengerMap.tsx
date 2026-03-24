/**
 * 用户端地图组件
 * 封装了乘客端常用的地图功能
 */
import React, { useState, useCallback } from 'react';
import {
  MapView,
  MapMarker,
  MapRoute,
  LocationPicker,
  DriverTracker,
  type Position,
  type RouteInfo,
} from '@didi/ui';
import './PassengerMap.css';

interface PassengerMapProps {
  amapKey?: string;
  securityJsCode?: string;
  onOriginChange?: (position: Position, address?: string) => void;
  onDestinationChange?: (position: Position, address?: string) => void;
  driverPosition?: Position;
  showDriver?: boolean;
  routePath?: Position[];
}

const PassengerMap: React.FC<PassengerMapProps> = ({
  amapKey,
  securityJsCode,
  onOriginChange,
  onDestinationChange,
  driverPosition,
  showDriver = false,
  routePath = [],
}) => {
  const [origin, setOrigin] = useState<Position | null>(null);
  const [destination, setDestination] = useState<Position | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [mapMode, setMapMode] = useState<'pick' | 'route'>('pick');

  // 起点变化
  const handleOriginChange = useCallback(
    (position: Position, address?: string) => {
      setOrigin(position);
      if (onOriginChange) {
        onOriginChange(position, address);
      }
    },
    [onOriginChange]
  );

  // 终点变化
  const handleDestinationChange = useCallback(
    (position: Position, address?: string) => {
      setDestination(position);
      if (onDestinationChange) {
        onDestinationChange(position, address);
      }
    },
    [onDestinationChange]
  );

  // 路线规划完成
  const handleRouteComplete = useCallback((info: RouteInfo) => {
    setRouteInfo(info);
  }, []);

  // 选择起点
  const handlePickOrigin = useCallback(() => {
    setMapMode('pick');
  }, []);

  // 选择终点
  const handlePickDestination = useCallback(() => {
    setMapMode('pick');
  }, []);

  return (
    <div className="passenger-map">
      {mapMode === 'pick' ? (
        // 选点模式
        <div className="passenger-map-picker">
          <LocationPicker
            amapKey={amapKey}
            securityJsCode={securityJsCode}
            onPositionChange={destination ? handleDestinationChange : handleOriginChange}
            showSearch={true}
          />
          <div className="passenger-map-picker-actions">
            <button onClick={handlePickOrigin}>选择起点</button>
            <button onClick={handlePickDestination}>选择终点</button>
          </div>
        </div>
      ) : (
        // 路线模式
        <MapView
          amapKey={amapKey}
          securityJsCode={securityJsCode}
          center={origin || undefined}
          zoom={14}
        >
          {/* 起点标记 */}
          {origin && <MapMarker position={origin} type="origin" label="起点" />}

          {/* 终点标记 */}
          {destination && <MapMarker position={destination} type="destination" label="终点" />}

          {/* 路线 */}
          {origin && destination && (
            <MapRoute
              origin={origin}
              destination={destination}
              onRouteComplete={handleRouteComplete}
            />
          )}

          {/* 司机位置 */}
          {showDriver && driverPosition && routePath.length > 0 && (
            <DriverTracker
              driverPosition={driverPosition}
              routePath={routePath}
              autoTrack={true}
            />
          )}
        </MapView>
      )}

      {/* 路线信息卡片 */}
      {routeInfo && (
        <div className="passenger-map-route-card">
          <div className="passenger-map-route-info">
            <span className="passenger-map-route-distance">
              {(routeInfo.distance / 1000).toFixed(1)} 公里
            </span>
            <span className="passenger-map-route-duration">
              约 {Math.ceil(routeInfo.duration / 60)} 分钟
            </span>
          </div>
          <button className="passenger-map-call-car">呼叫快车</button>
        </div>
      )}
    </div>
  );
};

export default PassengerMap;
