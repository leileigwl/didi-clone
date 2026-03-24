import React, { useEffect, useRef, useState } from 'react';
import { useMap } from './MapView';
import type { Position, RouteInfo } from './types';
import './MapRoute.css';

interface MapRouteProps {
  origin: Position;
  destination: Position;
  color?: string;
  lineWidth?: number;
  showInfo?: boolean;
  onRouteComplete?: (routeInfo: RouteInfo) => void;
}

const MapRoute: React.FC<MapRouteProps> = ({
  origin,
  destination,
  color = '#1890ff',
  lineWidth = 6,
  showInfo = true,
  onRouteComplete,
}) => {
  const { map, AMap, isLoaded } = useMap();
  const polylineRef = useRef<AMap.Polyline | null>(null);
  const drivingRef = useRef<any>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!map || !AMap || !isLoaded) return;

    // 清除旧的路线
    if (polylineRef.current) {
      map.remove(polylineRef.current);
      polylineRef.current = null;
    }

    // 清除旧的驾车规划
    if (drivingRef.current) {
      drivingRef.current.clear();
    }

    setIsLoading(true);

    // 创建驾车规划实例
    drivingRef.current = new (AMap as any).Driving({
      policy: (AMap as any).DrivingPolicy.LEAST_TIME, // 最快路线
      hideMarkers: true, // 隐藏起终点标记
      isOutline: true,
      outlineColor: 'white',
      autoFitView: true,
    });

    // 规划路线
    drivingRef.current.search(
      [origin.lng, origin.lat],
      [destination.lng, destination.lat],
      (status: string, result: any) => {
        setIsLoading(false);

        if (status === 'complete' && result.routes && result.routes.length > 0) {
          const route = result.routes[0];
          const path: Position[] = [];

          // 提取路径点
          route.steps.forEach((step: any) => {
            step.path.forEach((point: any) => {
              path.push({
                lng: point.lng,
                lat: point.lat,
              });
            });
          });

          // 创建折线
          const pathArray = path.map((p) => [p.lng, p.lat]);
          polylineRef.current = new (AMap as any).Polyline({
            path: pathArray,
            strokeColor: color,
            strokeWeight: lineWidth,
            strokeOpacity: 1,
            lineJoin: 'round',
            lineCap: 'round',
            zIndex: 50,
            showDir: true, // 显示方向箭头
          });

          map.add(polylineRef.current);
          map.setFitView([polylineRef.current]);

          // 保存路线信息
          const info: RouteInfo = {
            distance: route.distance,
            duration: route.time,
            path,
          };
          setRouteInfo(info);

          if (onRouteComplete) {
            onRouteComplete(info);
          }
        } else {
          console.error('路线规划失败:', result);
        }
      }
    );

    return () => {
      if (polylineRef.current && map) {
        map.remove(polylineRef.current);
        polylineRef.current = null;
      }
      if (drivingRef.current) {
        drivingRef.current.clear();
      }
    };
  }, [map, AMap, isLoaded, origin.lng, origin.lat, destination.lng, destination.lat, color, lineWidth]);

  // 格式化距离
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}公里`;
    }
    return `${meters}米`;
  };

  // 格式化时间
  const formatDuration = (seconds: number): string => {
    const minutes = Math.ceil(seconds / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}小时${mins}分钟`;
    }
    return `${minutes}分钟`;
  };

  return (
    <>
      {isLoading && (
        <div className="map-route-loading">
          <div className="map-route-loading-spinner"></div>
          <span>规划路线中...</span>
        </div>
      )}
      {showInfo && routeInfo && !isLoading && (
        <div className="map-route-info">
          <div className="map-route-info-item">
            <span className="map-route-info-icon distance-icon"></span>
            <span className="map-route-info-value">{formatDistance(routeInfo.distance)}</span>
          </div>
          <div className="map-route-info-divider"></div>
          <div className="map-route-info-item">
            <span className="map-route-info-icon time-icon"></span>
            <span className="map-route-info-value">{formatDuration(routeInfo.duration)}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default MapRoute;
