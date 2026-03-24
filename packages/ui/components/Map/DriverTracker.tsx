import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from './MapView';
import MapMarker from './MapMarker';
import type { Position, RouteInfo } from './types';
import './DriverTracker.css';

interface DriverTrackerProps {
  // 司机位置
  driverPosition: Position;
  // 司机朝向角度
  driverAngle?: number;
  // 路线信息
  routePath: Position[];
  // 是否自动跟踪
  autoTrack?: boolean;
  // 位置更新回调
  onPositionUpdate?: (position: Position) => void;
  // 到达终点回调
  onArrive?: () => void;
  // 移动速度（米/秒）
  moveSpeed?: number;
  // 是否模拟移动（用于测试）
  simulateMove?: boolean;
}

const DriverTracker: React.FC<DriverTrackerProps> = ({
  driverPosition,
  driverAngle = 0,
  routePath,
  autoTrack = true,
  onPositionUpdate,
  onArrive,
  moveSpeed = 10, // 默认 10 米/秒
  simulateMove = false,
}) => {
  const { map, isLoaded } = useMap();
  const [currentPosition, setCurrentPosition] = useState<Position>(driverPosition);
  const [currentAngle, setCurrentAngle] = useState(driverAngle);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // 更新当前位置
  useEffect(() => {
    if (!simulateMove) {
      setCurrentPosition(driverPosition);
      setCurrentAngle(driverAngle);
    }
  }, [driverPosition, driverAngle, simulateMove]);

  // 计算两点之间的角度
  const calculateAngle = useCallback((from: Position, to: Position): number => {
    const dx = to.lng - from.lng;
    const dy = to.lat - from.lat;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return angle;
  }, []);

  // 计算两点之间的距离（米）
  const calculateDistance = useCallback((from: Position, to: Position): number => {
    const R = 6371000; // 地球半径（米）
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
    const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // 线性插值
  const lerp = useCallback((start: number, end: number, t: number): number => {
    return start + (end - start) * t;
  }, []);

  // 模拟移动动画
  const animateMove = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = (timestamp - lastTimeRef.current) / 1000; // 转换为秒
      lastTimeRef.current = timestamp;

      if (currentPathIndex >= routePath.length - 1) {
        // 到达终点
        setIsMoving(false);
        if (onArrive) {
          onArrive();
        }
        return;
      }

      const currentTarget = routePath[currentPathIndex + 1];
      const distance = calculateDistance(currentPosition, currentTarget);
      const moveDistance = moveSpeed * deltaTime;
      const t = Math.min(moveDistance / distance, 1);

      // 更新位置
      const newPosition: Position = {
        lng: lerp(currentPosition.lng, currentTarget.lng, t),
        lat: lerp(currentPosition.lat, currentTarget.lat, t),
      };

      // 更新角度
      const newAngle = calculateAngle(currentPosition, currentTarget);

      setCurrentPosition(newPosition);
      setCurrentAngle(newAngle);

      // 计算进度
      const totalDistance = routePath.reduce((acc, _, i) => {
        if (i < routePath.length - 1) {
          return acc + calculateDistance(routePath[i], routePath[i + 1]);
        }
        return acc;
      }, 0);

      let traveledDistance = 0;
      for (let i = 0; i < currentPathIndex; i++) {
        traveledDistance += calculateDistance(routePath[i], routePath[i + 1]);
      }
      traveledDistance += calculateDistance(routePath[currentPathIndex], newPosition);
      setProgress(Math.min((traveledDistance / totalDistance) * 100, 100));

      // 检查是否到达当前目标点
      if (t >= 1) {
        setCurrentPathIndex((prev) => prev + 1);
      }

      // 回调
      if (onPositionUpdate) {
        onPositionUpdate(newPosition);
      }

      // 继续动画
      animationRef.current = requestAnimationFrame(animateMove);
    },
    [
      currentPathIndex,
      routePath,
      currentPosition,
      moveSpeed,
      calculateDistance,
      calculateAngle,
      lerp,
      onPositionUpdate,
      onArrive,
    ]
  );

  // 开始移动
  const startMove = useCallback(() => {
    if (routePath.length < 2) return;

    setIsMoving(true);
    lastTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animateMove);
  }, [routePath, animateMove]);

  // 停止移动
  const stopMove = useCallback(() => {
    setIsMoving(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // 重置
  const resetMove = useCallback(() => {
    stopMove();
    setCurrentPathIndex(0);
    setProgress(0);
    if (routePath.length > 0) {
      setCurrentPosition(routePath[0]);
    }
  }, [stopMove, routePath]);

  // 自动跟踪
  useEffect(() => {
    if (autoTrack && map && isLoaded) {
      map.setCenter([currentPosition.lng, currentPosition.lat]);
    }
  }, [autoTrack, map, isLoaded, currentPosition]);

  // 模拟移动模式
  useEffect(() => {
    if (simulateMove && routePath.length > 0) {
      startMove();
    }

    return () => {
      stopMove();
    };
  }, [simulateMove, routePath, startMove, stopMove]);

  return (
    <div className="driver-tracker">
      {/* 司机标记 */}
      <MapMarker
        position={currentPosition}
        type="car"
        angle={currentAngle}
        label={isMoving ? '行驶中' : '待命'}
      />

      {/* 进度条 */}
      {isMoving && (
        <div className="driver-tracker-progress">
          <div className="driver-tracker-progress-bar">
            <div
              className="driver-tracker-progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="driver-tracker-progress-text">{progress.toFixed(1)}%</span>
        </div>
      )}

      {/* 控制按钮（模拟模式） */}
      {simulateMove && (
        <div className="driver-tracker-controls">
          {!isMoving ? (
            <button className="driver-tracker-btn start" onClick={startMove}>
              开始移动
            </button>
          ) : (
            <button className="driver-tracker-btn stop" onClick={stopMove}>
              停止移动
            </button>
          )}
          <button className="driver-tracker-btn reset" onClick={resetMove}>
            重置
          </button>
        </div>
      )}
    </div>
  );
};

export default DriverTracker;
