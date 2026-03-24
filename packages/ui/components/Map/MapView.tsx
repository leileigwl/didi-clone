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
      console.log('高德地图脚本加载成功');
      resolve((window as any).AMap);
    };
    script.onerror = (e) => {
      console.error('高德地图脚本加载失败:', e);
      reject(new Error('高德地图脚本加载失败'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

const MapView: React.FC<MapViewProps> = ({
  amapKey = '7bf10417175742fc23ec515c46599e8d',
  securityJsCode = '2d974a0b6b5a0df9c012c82a33684e15',
  center = { lng: 116.397428, lat: 39.90923 },
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
      setError('缺少高德地图 API Key');
      return;
    }

    console.log('正在加载高德地图, Key:', amapKey.substring(0, 8) + '...');

    let map: AMap.Map | null = null;

    loadAMapScript(amapKey, securityJsCode)
      .then((AMap) => {
        if (!containerRef.current) return;

        console.log('创建地图实例...');

        // 创建地图实例 - 使用官方示例的方式
        map = new AMap.Map(containerRef.current, {
          zoom: zoom,
          center: [center.lng, center.lat],
          viewMode: '2D',
          mapStyle: getMapStyle(theme),
          dragEnable: enableDrag,
          zoomEnable: true,
          resizeEnable: true,
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

        console.log('地图加载成功!');

        // 回调
        if (onMapReady) {
          onMapReady(map, AMap);
        }
      })
      .catch((e) => {
        console.error('地图加载失败:', e);
        let errorMsg = typeof e === 'string' ? e : (e.message || '地图加载失败');

        if (errorMsg.includes('INVALID_USER_KEY') || errorMsg.includes('USERKEY')) {
          errorMsg = 'API Key 无效或未授权此域名，请在高德开放平台添加域名白名单';
        } else if (errorMsg.includes('INVALID_USER_SCODE')) {
          errorMsg = '安全密钥配置错误';
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