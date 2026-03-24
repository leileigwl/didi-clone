import React, { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
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
  amapKey?: string;
  securityJsCode?: string;
  center?: Position;
  zoom?: number;
  theme?: MapTheme;
  enableClick?: boolean;
  enableDrag?: boolean;
  onMapClick?: (position: Position) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onMapReady?: (map: AMap.Map, AMap: typeof AMap) => void;
}

// 全局标记是否已加载脚本
let isScriptLoaded = false;
let scriptLoadPromise: Promise<typeof AMap> | null = null;

// 加载高德地图脚本
function loadAMapScript(key: string, securityCode?: string): Promise<typeof AMap> {
  if (isScriptLoaded && (window as any).AMap) {
    return Promise.resolve((window as any).AMap);
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    // 设置安全密钥 - 必须在加载脚本之前设置
    if (securityCode) {
      (window as any)._AMapSecurityConfig = {
        securityJsCode: securityCode,
      };
    }

    // 检查是否已存在脚本
    const existingScript = document.querySelector(`script[src*="webapi.amap.com/maps"]`);
    if (existingScript && (window as any).AMap) {
      isScriptLoaded = true;
      resolve((window as any).AMap);
      return;
    }

    // 创建脚本标签
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`;
    script.onload = () => {
      isScriptLoaded = true;
      resolve((window as any).AMap);
    };
    script.onerror = () => {
      reject(new Error('高德地图脚本加载失败'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

const MapView: React.FC<MapViewProps> = ({
  amapKey = '7bf10417175742fc23ec515c46599e8d',
  securityJsCode = '2d974a0b6b5a0df9c012c82a33684e15',
  center = { lng: 120.075, lat: 29.306 },
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
  const mapRef = useRef<AMap.Map | null>(null);
  const isInitializedRef = useRef(false);
  const clickHandlerRef = useRef<any>(null);

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

  // 初始化地图 - 只执行一次
  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }

    if (!containerRef.current) {
      setError('地图容器未找到');
      return;
    }

    if (!amapKey) {
      setError('缺少高德地图 API Key');
      return;
    }

    isInitializedRef.current = true;

    loadAMapScript(amapKey, securityJsCode)
      .then((AMap) => {
        if (!containerRef.current || mapRef.current) {
          return;
        }

        try {
          // 创建地图实例
          const map = new AMap.Map(containerRef.current, {
            zoom: zoom,
            center: [center.lng, center.lat],
            viewMode: '2D',
            mapStyle: getMapStyle(theme),
            dragEnable: enableDrag,
            zoomEnable: true,
            resizeEnable: true,
          });

          mapRef.current = map;

          setMapInstance(map);
          setAMapInstance(() => AMap);
          setIsLoaded(true);
          setError(null);

          // 回调
          if (onMapReady) {
            onMapReady(map, AMap);
          }
        } catch (e: any) {
          console.error('[MapView] Error creating map:', e);
          setError(e.message || '创建地图失败');
          isInitializedRef.current = false;
        }
      })
      .catch((e) => {
        console.error('[MapView] Map load failed:', e);
        let errorMsg = typeof e === 'string' ? e : (e.message || '地图加载失败');

        if (errorMsg.includes('INVALID_USER_KEY') || errorMsg.includes('USERKEY')) {
          errorMsg = 'API Key 无效或未授权此域名，请在高德开放平台添加域名白名单';
        } else if (errorMsg.includes('INVALID_USER_SCODE')) {
          errorMsg = '安全密钥配置错误';
        }

        setError(errorMsg);
        isInitializedRef.current = false;
      });

    // Cleanup - 只在组件卸载时执行
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []); // 空依赖数组 - 只在挂载时执行一次

  // 动态处理点击事件
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 移除旧的点击处理器
    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }

    // 如果启用点击，添加新的处理器
    if (enableClick && onMapClick) {
      const handler = (e: any) => {
        const position: Position = {
          lng: e.lnglat.getLng(),
          lat: e.lnglat.getLat(),
        };
        onMapClick(position);
      };
      map.on('click', handler);
      clickHandlerRef.current = handler;
    }
  }, [enableClick, onMapClick]);

  // 更新中心点
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setCenter([center.lng, center.lat]);
    }
  }, [center.lng, center.lat]);

  // 更新缩放级别
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setZoom(zoom);
    }
  }, [zoom]);

  // 更新主题
  useEffect(() => {
    if (mapRef.current) {
      (mapRef.current as any).setMapStyle(getMapStyle(theme));
    }
  }, [theme, getMapStyle]);

  // 更新拖拽状态
  useEffect(() => {
    if (mapRef.current) {
      (mapRef.current as any).setStatus({
        dragEnable: enableDrag,
      });
    }
  }, [enableDrag]);

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