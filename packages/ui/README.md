# Map Components

This package contains reusable map components for the ride-hailing application.

## Components

### MapView
The main map container component that initializes AMap (Gaode Map).

```tsx
import { MapView } from '@didi/ui';

<MapView
  amapKey="your-amap-key"
  securityJsCode="your-security-code"
  center={{ lng: 116.397428, lat: 39.90923 }}
  zoom={15}
  theme="normal"
  onMapReady={(map, AMap) => {
    // Map is ready
  }}
>
  {/* Child components */}
</MapView>
```

### MapMarker
Custom marker component for displaying locations.

```tsx
import { MapMarker } from '@didi/ui';

<MapMarker
  position={{ lng: 116.397428, lat: 39.90923 }}
  type="passenger" // 'passenger' | 'driver' | 'origin' | 'destination' | 'car'
  label="当前位置"
  angle={45} // Rotation angle
/>
```

### MapRoute
Route drawing component with distance and duration display.

```tsx
import { MapRoute } from '@didi/ui';

<MapRoute
  origin={{ lng: 116.397428, lat: 39.90923 }}
  destination={{ lng: 116.407428, lat: 39.91923 }}
  color="#1890ff"
  showInfo={true}
  onRouteComplete={(routeInfo) => {
    console.log(routeInfo.distance, routeInfo.duration);
  }}
/>
```

### LocationPicker
Location picker component with search and geolocation.

```tsx
import { LocationPicker } from '@didi/ui';

<LocationPicker
  amapKey="your-amap-key"
  onPositionChange={(position, address) => {
    console.log(position, address);
  }}
  showSearch={true}
/>
```

### DriverTracker
Driver position tracker with movement animation.

```tsx
import { DriverTracker } from '@didi/ui';

<DriverTracker
  driverPosition={{ lng: 116.397428, lat: 39.90923 }}
  routePath={pathArray}
  autoTrack={true}
  simulateMove={true} // For testing
  moveSpeed={10} // meters per second
  onArrive={() => {
    console.log('Driver arrived');
  }}
/>
```

## Environment Variables

Create a `.env` file in your project root:

```
VITE_AMAP_KEY=your-amap-key
VITE_AMAP_SECURITY_CODE=your-security-code
```

## Getting AMap Key

1. Visit [AMap Developer Platform](https://lbs.amap.com/)
2. Register and create an application
3. Get your Web JS API key
4. For production, also get a security code

## License

MIT
