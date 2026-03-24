import React, { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import type { Position, MapTheme } from './types';
import './MapView.css';

// 地图上下文
interface MapContextType {
  map: AMap.Map | null;
  AMap: typeof AMap | null;
  isLoaded: boolean;
}

const MapContext = createContext<MapContextType>({
  map: null,
  AMap: null,
  isLoaded: false,
});

export const useMap = () => useContext(MapContext);

interface MapViewProps {
  // 地图配置
  amapKey?: string;
  securityJsCode?: string;
  center?: Position;
  zoom?: number;
  theme?: MapTheme;

  // 交互配置
  enableClick?: boolean;
  enableDrag?: boolean;
  onMapClick?: (position: Position) => void;

  // 样式
  className?: string;
  style?: React.CSSProperties;

  // 子组件
  children?: React.ReactNode;

  // 地图加载完成回调
  onMapReady?: (map: AMap.Map, AMap: typeof AMap) => void;
}

const MapView: React.FC<MapViewProps> = ({
  amapKey = import.meta.env.VITE_AMAP_KEY || '',
  securityJsCode = import.meta.env.VITE_AMAP_SECURITY_CODE || '',
  center = { lng: 116.397428, lat: 39.90923 }, // 默认北京
  zoom = 15,
  theme = 'normal',
  enableClick = false,
  enableDrag = true,
  onMapClick,
  className = '',
  style,
  children,
  onMapReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<AMap.Map | null>(null);
  const [AMapInstance, setAMapInstance] = useState<typeof AMap | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取地图样式
  const getMapStyle = useCallback((theme: MapTheme): string => {
    const styles: Record<MapTheme, string> = {
      normal: 'amap://styles/normal',
      dark: 'amap://styles/dark',
      light: 'amap://styles/whitesmoke',
    };
    return styles[theme];
  }, []);

  // 初始化地图
  useEffect(() => {
    if (!containerRef.current) {
      setError('地图容器未找到');
      return;
    }

    if (!amapKey) {
      setError('缺少高德地图 API Key，请检查 .env 配置');
      console.error('AMAP_KEY is empty or undefined');
      return;
    }

    console.log('正在加载高德地图, Key:', amapKey.substring(0, 8) + '...');

    // 设置安全密钥 - 必须在加载前设置
    if (securityJsCode) {
      (window as any)._AMapSecurityConfig = {
        securityJsCode,
      };
      console.log('已设置安全密钥');
    } else {
      console.warn('未设置安全密钥(securityJsCode)');
    }

    let map: AMap.Map | null = null;

    AMapLoader.load({
      key: amapKey,
      version: '2.0',
      plugins: [
        'AMap.Geolocation',
        'AMap.Geocoder',
        'AMap.Driving',
        'AMap.PlaceSearch',
        'AMap.Marker',
        'AMap.Polyline',
      ],
    })
      .then((AMap) => {
        if (!containerRef.current) return;

        map = new AMap.Map(containerRef.current, {
          viewMode: '2D',
          zoom,
          center: [center.lng, center.lat],
          mapStyle: getMapStyle(theme),
          dragEnable: enableDrag,
          zoomEnable: true,
          doubleClickZoom: true,
          keyboardEnable: true,
        });

        // 点击事件
        if (enableClick && onMapClick) {
          map.on('click', (e: any) => {
            const position: Position = {
              lng: e.lnglat.getLng(),
              lat: e.lnglat.getLat(),
            };
            onMapClick(position);
          });
        }

        setMapInstance(map);
        setAMapInstance(() => AMap);
        setIsLoaded(true);
        setError(null);

        // 回调
        if (onMapReady) {
          onMapReady(map, AMap);
        }
      })
      .catch((e) => {
        console.error('地图加载失败:', e);
        let errorMsg = '地图加载失败';
        if (e.message) {
          errorMsg = e.message;
        } else if (typeof e === 'string') {
          errorMsg = e;
        }
        // 常见错误提示
        if (errorMsg.includes('INVALID_USER_KEY') || errorMsg.includes('USERKEY')) {
          errorMsg = 'API Key 无效或未授权此域名，请在高德开放平台添加域名白名单';
        } else if (errorMsg.includes('INVALID_USER_SCODE')) {
          errorMsg = '安全密钥配置错误';
        } else if (errorMsg.includes('network') || errorMsg.includes('Network')) {
          errorMsg = '网络错误，请检查网络连接';
        }
        setError(errorMsg);
      });

    return () => {
      if (map) {
        map.destroy();
      }
    };
  }, [amapKey, securityJsCode]);

  // 更新中心点
  useEffect(() => {
    if (mapInstance) {
      mapInstance.setCenter([center.lng, center.lat]);
    }
  }, [center.lng, center.lat, mapInstance]);

  // 更新缩放级别
  useEffect(() => {
    if (mapInstance) {
      mapInstance.setZoom(zoom);
    }
  }, [zoom, mapInstance]);

  // 更新主题
  useEffect(() => {
    if (mapInstance) {
      (mapInstance as any).setMapStyle(getMapStyle(theme));
    }
  }, [theme, mapInstance, getMapStyle]);

  // 更新拖拽状态
  useEffect(() => {
    if (mapInstance) {
      (mapInstance as any).setStatus({
        dragEnable: enableDrag,
      });
    }
  }, [enableDrag, mapInstance]);

  return (
    <MapContext.Provider value={{ map: mapInstance, AMap: AMapInstance, isLoaded }}>
      <div
        ref={containerRef}
        className={`map-view-container ${className}`}
        style={style}
      >
        {!isLoaded && !error && (
          <div className="map-loading">
            <div className="map-loading-spinner"></div>
            <span>地图加载中...</span>
          </div>
        )}
        {error && (
          <div className="map-error">
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
              <div>{error}</div>
            </div>
          </div>
        )}
        {isLoaded && children}
      </div>
    </MapContext.Provider>
  );
};

export default MapView;
