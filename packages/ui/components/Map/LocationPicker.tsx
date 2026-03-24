import React, { useState, useCallback, useRef, useEffect } from 'react';
import MapView from './MapView';
import MapMarker from './MapMarker';
import type { Position } from './types';
import './LocationPicker.css';

interface POI {
  id: string;
  name: string;
  address: string;
  location: Position;
  distance?: number;
}

interface LocationPickerProps {
  amapKey?: string;
  securityJsCode?: string;
  initialPosition?: Position;
  onPositionChange?: (position: Position, address?: string) => void;
  showSearch?: boolean;
  searchPlaceholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  amapKey,
  securityJsCode,
  initialPosition,
  onPositionChange,
  showSearch = true,
  searchPlaceholder = '搜索地点',
  className = '',
  style,
}) => {
  const [position, setPosition] = useState<Position>(
    initialPosition || { lng: 120.075, lat: 29.306 }
  );
  const [address, setAddress] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<POI[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [geocoder, setGeocoder] = useState<any>(null);
  const [placeSearch, setPlaceSearch] = useState<any>(null);

  const mapRef = useRef<{ map: AMap.Map; AMap: typeof AMap } | null>(null);

  // 地图加载完成
  const handleMapReady = useCallback((map: AMap.Map, AMap: typeof AMap) => {
    mapRef.current = { map, AMap };
    setMapReady(true);

    // 初始化地理编码服务
    const geocoderInstance = new (AMap as any).Geocoder({
      city: '全国',
      radius: 1000,
    });
    setGeocoder(geocoderInstance);

    // 初始化地点搜索服务
    const placeSearchInstance = new (AMap as any).PlaceSearch({
      pageSize: 10,
      pageIndex: 1,
      extensions: 'all',
    });
    setPlaceSearch(placeSearchInstance);

    // 获取当前位置
    handleGetCurrentLocation(map, AMap, geocoderInstance);
  }, []);

  // 获取当前位置（IP 定位）
  const handleGetCurrentLocation = useCallback(
    (map?: AMap.Map, AMap?: typeof AMap, geocoderInstance?: any) => {
      const currentMap = map || mapRef.current?.map;
      const currentAMap = AMap || mapRef.current?.AMap;
      const currentGeocoder = geocoderInstance || geocoder;

      if (!currentMap || !currentAMap || !currentGeocoder) return;

      setIsLocating(true);

      // 使用高德定位插件
      const geolocation = new (currentAMap as any).Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        convert: true,
        showButton: false,
        showMarker: false,
        showCircle: false,
        panToLocation: false,
        zoomToAccuracy: false,
      });

      geolocation.getCurrentPosition(
        (status: string, result: any) => {
          setIsLocating(false);

          if (status === 'complete') {
            const pos: Position = {
              lng: result.position.lng,
              lat: result.position.lat,
            };
            setPosition(pos);
            currentMap.setCenter([pos.lng, pos.lat]);

            // 获取地址
            getAddressByPosition(pos, currentGeocoder);
          } else {
            console.warn('定位失败，使用默认位置');
            // 使用默认位置
            getAddressByPosition(position, currentGeocoder);
          }
        },
        (error: any) => {
          setIsLocating(false);
          console.error('定位错误:', error);
          // 使用默认位置
          getAddressByPosition(position, currentGeocoder);
        }
      );
    },
    [geocoder, position]
  );

  // 根据坐标获取地址
  const getAddressByPosition = useCallback(
    (pos: Position, geocoderInstance?: any) => {
      const currentGeocoder = geocoderInstance || geocoder;
      if (!currentGeocoder) return;

      currentGeocoder.getAddress([pos.lng, pos.lat], (status: string, result: any) => {
        if (status === 'complete' && result.regeocode) {
          const addr = result.regeocode.formattedAddress;
          setAddress(addr);

          if (onPositionChange) {
            onPositionChange(pos, addr);
          }
        }
      });
    },
    [geocoder, onPositionChange]
  );

  // 点击地图选点
  const handleMapClick = useCallback(
    (pos: Position) => {
      setPosition(pos);
      setSearchKeyword('');
      setShowResults(false);
      getAddressByPosition(pos);
    },
    [getAddressByPosition]
  );

  // 搜索地点
  const handleSearch = useCallback(
    (keyword: string) => {
      if (!keyword.trim() || !placeSearch) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      placeSearch.search(keyword, (status: string, result: any) => {
        if (status === 'complete' && result.poiList) {
          const pois: POI[] = result.poiList.pois.map((poi: any) => ({
            id: poi.id,
            name: poi.name,
            address: poi.address || poi.pname + poi.cityname + poi.adname,
            location: {
              lng: poi.location.lng,
              lat: poi.location.lat,
            },
            distance: poi.distance,
          }));
          setSearchResults(pois);
          setShowResults(true);
        } else {
          setSearchResults([]);
          setShowResults(false);
        }
      });
    },
    [placeSearch]
  );

  // 选择搜索结果
  const handleSelectPOI = useCallback(
    (poi: POI) => {
      setPosition(poi.location);
      setAddress(poi.address);
      setSearchKeyword(poi.name);
      setShowResults(false);

      if (mapRef.current?.map) {
        mapRef.current.map.setCenter([poi.location.lng, poi.location.lat]);
      }

      if (onPositionChange) {
        onPositionChange(poi.location, poi.address);
      }
    },
    [onPositionChange]
  );

  // 输入框变化
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchKeyword(value);
      handleSearch(value);
    },
    [handleSearch]
  );

  // 清除搜索
  const handleClearSearch = useCallback(() => {
    setSearchKeyword('');
    setSearchResults([]);
    setShowResults(false);
  }, []);

  return (
    <div className={`location-picker ${className}`} style={style}>
      {/* 搜索栏 */}
      {showSearch && (
        <div className="location-search">
          <div className="location-search-input-wrapper">
            <span className="location-search-icon"></span>
            <input
              type="text"
              className="location-search-input"
              placeholder={searchPlaceholder}
              value={searchKeyword}
              onChange={handleInputChange}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
            />
            {searchKeyword && (
              <button className="location-search-clear" onClick={handleClearSearch}>
                x
              </button>
            )}
          </div>

          {/* 搜索结果 */}
          {showResults && searchResults.length > 0 && (
            <div className="location-search-results">
              {searchResults.map((poi) => (
                <div
                  key={poi.id}
                  className="location-search-result-item"
                  onClick={() => handleSelectPOI(poi)}
                >
                  <div className="location-search-result-name">{poi.name}</div>
                  <div className="location-search-result-address">{poi.address}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 地图 */}
      <div className="location-picker-map">
        <MapView
          amapKey={amapKey}
          securityJsCode={securityJsCode}
          center={position}
          zoom={16}
          enableClick={true}
          onMapClick={handleMapClick}
          onMapReady={handleMapReady}
        >
          {/* 当前位置标记 */}
          <MapMarker position={position} type="origin" label="当前位置" />
        </MapView>

        {/* 定位按钮 */}
        <button
          className="location-locate-button"
          onClick={() => handleGetCurrentLocation()}
          disabled={isLocating || !mapReady}
        >
          {isLocating ? (
            <span className="location-locate-loading"></span>
          ) : (
            <span className="location-locate-icon"></span>
          )}
        </button>
      </div>

      {/* 当前地址显示 */}
      {address && (
        <div className="location-address">
          <span className="location-address-label">当前位置：</span>
          <span className="location-address-value">{address}</span>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
