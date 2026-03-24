import React, { useEffect, useRef } from 'react';
import { useMap } from './MapView';
import type { Position, MarkerType } from './types';
import './MapMarker.css';

interface MapMarkerProps {
  position: Position;
  type?: MarkerType;
  label?: string;
  angle?: number; // 旋转角度，用于司机朝向
  onClick?: () => void;
  draggable?: boolean;
  onDragEnd?: (position: Position) => void;
  zIndex?: number;
}

// 标记图标配置
const markerIcons: Record<MarkerType, { icon: string; size: [number, number]; anchor: [number, number] }> = {
  passenger: {
    icon: `<svg viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="#1890ff"/>
      <circle cx="16" cy="14" r="6" fill="white"/>
    </svg>`,
    size: [32, 40],
    anchor: [16, 40],
  },
  driver: {
    icon: `<svg viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="#fa8c16"/>
      <circle cx="16" cy="14" r="6" fill="white"/>
    </svg>`,
    size: [32, 40],
    anchor: [16, 40],
  },
  origin: {
    icon: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#52c41a" stroke="white" stroke-width="3"/>
      <circle cx="16" cy="16" r="4" fill="white"/>
    </svg>`,
    size: [32, 32],
    anchor: [16, 16],
  },
  destination: {
    icon: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#f5222d" stroke="white" stroke-width="3"/>
      <circle cx="16" cy="16" r="4" fill="white"/>
    </svg>`,
    size: [32, 32],
    anchor: [16, 16],
  },
  car: {
    icon: `<svg viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="rgba(255,107,0,0.2)"/>
      <circle cx="20" cy="20" r="10" fill="#FF6B00"/>
      <circle cx="20" cy="20" r="5" fill="white"/>
    </svg>`,
    size: [40, 48],
    anchor: [20, 24],
  },
  myLocation: {
    icon: `<span style="font-size: 32px; line-height: 1;">📍</span>`,
    size: [32, 32],
    anchor: [16, 32],
  },
};

const MapMarker: React.FC<MapMarkerProps> = ({
  position,
  type = 'passenger',
  label,
  angle = 0,
  onClick,
  draggable = false,
  onDragEnd,
  zIndex = 100,
}) => {
  const { map, AMap, isLoaded } = useMap();
  const markerRef = useRef<AMap.Marker | null>(null);

  useEffect(() => {
    if (!map || !AMap || !isLoaded) return;

    // 创建标记
    if (!markerRef.current) {
      const config = markerIcons[type];
      const content = `
        <div class="map-marker map-marker-${type}" style="transform: rotate(${angle}deg)">
          ${config.icon}
          ${label ? `<div class="map-marker-label">${label}</div>` : ''}
        </div>
      `;

      markerRef.current = new AMap.Marker({
        position: [position.lng, position.lat],
        content,
        offset: new (AMap as any).Pixel(-config.anchor[0], -config.anchor[1]),
        draggable,
        zIndex,
      });

      // 点击事件
      if (onClick) {
        markerRef.current.on('click', onClick);
      }

      // 拖拽结束事件
      if (draggable && onDragEnd) {
        markerRef.current.on('dragend', (e: any) => {
          const pos = e.target.getPosition();
          onDragEnd({
            lng: pos.getLng(),
            lat: pos.getLat(),
          });
        });
      }

      map.add(markerRef.current);
    } else {
      // 更新位置
      markerRef.current.setPosition([position.lng, position.lat]);

      // 更新内容（角度或标签变化）
      const config = markerIcons[type];
      const content = `
        <div class="map-marker map-marker-${type}" style="transform: rotate(${angle}deg)">
          ${config.icon}
          ${label ? `<div class="map-marker-label">${label}</div>` : ''}
        </div>
      `;
      markerRef.current.setContent(content);
    }

    return () => {
      if (markerRef.current && map) {
        map.remove(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, AMap, isLoaded, position.lng, position.lat, type, label, angle, draggable, zIndex]);

  return null;
};

export default MapMarker;
