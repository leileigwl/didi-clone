// 高德地图类型定义

declare namespace AMap {
  interface Map {
    setCenter(position: [number, number]): void;
    getCenter(): LngLat;
    setZoom(zoom: number): void;
    getZoom(): number;
    setFitView(overlays: Overlay[]): void;
    clearMap(): void;
    destroy(): void;
    on(event: string, callback: (e: any) => void): void;
    off(event: string, callback: (e: any) => void): void;
    add(overlay: Overlay): void;
    remove(overlay: Overlay): void;
    pixelToLngLat(pixel: [number, number]): LngLat;
    lngLatToPixel(lngLat: LngLat): [number, number];
  }

  interface LngLat {
    getLng(): number;
    getLat(): number;
    toArray(): [number, number];
  }

  interface Overlay {
    setMap(map: Map | null): void;
    show(): void;
    hide(): void;
  }

  interface Marker extends Overlay {
    setPosition(position: [number, number]): void;
    getPosition(): LngLat;
    setIcon(icon: string | Icon): void;
    setContent(content: string | HTMLElement): void;
    setOffset(offset: [number, number]): void;
    setAngle(angle: number): void;
  }

  interface Polyline extends Overlay {
    setPath(path: [number, number][]): void;
    getPath(): [number, number][];
  }

  interface Icon {
    new (options: {
      size: [number, number];
      image: string;
      imageSize?: [number, number];
      imageOffset?: [number, number];
    }): Icon;
  }

  interface Geolocation {
    new (options?: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
      convert?: boolean;
      showButton?: boolean;
      buttonPosition?: string;
      showMarker?: boolean;
      showCircle?: boolean;
      panToLocation?: boolean;
      zoomToAccuracy?: boolean;
    }): Geolocation;
    getCurrentPosition(
      callback: (status: string, result: any) => void,
      error?: (error: any) => void
    ): void;
  }

  interface Geocoder {
    new (options?: {
      city?: string;
      radius?: number;
      extensions?: string;
    }): Geocoder;
    getAddress(
      lnglat: [number, number],
      callback: (status: string, result: any) => void
    ): void;
    getLocation(
      address: string,
      callback: (status: string, result: any) => void
    ): void;
  }

  interface Driving {
    new (options?: {
      policy?: number;
      ferry?: number;
      map?: Map;
      panel?: string | HTMLElement;
      hideMarkers?: boolean;
      isOutline?: boolean;
      outlineColor?: string;
      autoFitView?: boolean;
    }): Driving;
    search(
      origin: [number, number] | string,
      destination: [number, number] | string,
      waystops?: [number, number][],
      callback?: (status: string, result: any) => void
    ): void;
    search(
      origin: [number, number] | string,
      destination: [number, number] | string,
      opts?: { waystops?: [number, number][] },
      callback?: (status: string, result: any) => void
    ): void;
    clear(): void;
  }

  interface PlaceSearch {
    new (options?: {
      city?: string;
      citylimit?: boolean;
      pageSize?: number;
      pageIndex?: number;
      extensions?: string;
    }): PlaceSearch;
    search(
      keyword: string,
      callback: (status: string, result: any) => void
    ): void;
    searchNearBy(
      keyword: string,
      center: [number, number],
      radius: number,
      callback: (status: string, result: any) => void
    ): void;
  }

  interface MapOptions {
    viewMode?: '2D' | '3D';
    pitch?: number;
    zoom?: number;
    center?: [number, number];
    mapStyle?: string;
    features?: string[];
    layers?: any[];
  }
}

interface Window {
  AMap: typeof AMap;
  _AMapSecurityConfig: {
    securityJsCode: string;
  };
}

export type Position = {
  lng: number;
  lat: number;
};

export type RouteInfo = {
  distance: number; // 米
  duration: number; // 秒
  path: Position[];
};

export type MarkerType = 'passenger' | 'driver' | 'origin' | 'destination' | 'car' | 'myLocation';

export type MapTheme = 'normal' | 'dark' | 'light';
