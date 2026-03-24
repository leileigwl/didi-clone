interface ApiResponse<T = unknown> {
    code: number;
    data: T;
    message: string;
}
interface User {
    id: string;
    phone: string;
    name: string;
    avatar?: string;
}
interface Driver {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
    carModel: string;
    carPlate: string;
    rating: number;
    location: Location;
    distance?: number;
}
interface Location {
    address: string;
    lat: number;
    lng: number;
}
type OrderStatus = 'pending' | 'accepted' | 'arrived' | 'passenger_confirmed' | 'in_progress' | 'completed' | 'cancelled';
interface Order {
    id: string;
    userId: string;
    driverId?: string;
    status: OrderStatus;
    pickup: Location;
    destination: Location;
    price: number;
    distance: number;
    duration: number;
    driver?: Driver | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    /** 司机距乘客上车点的驾车距离 (km) */
    distanceFromDriver?: number;
    /** 司机到乘客上车点的驾车时间 (分钟) */
    durationFromDriver?: number;
}
interface CreateOrderInput {
    pickup: Location;
    destination: Location;
    price: number;
    distance: number;
    duration: number;
}
interface AuthResult {
    user: User;
    token: string;
}
interface DriverLocationEvent {
    orderId: string;
    location: {
        lat: number;
        lng: number;
    };
    timestamp: string;
}
interface OrderStatusEvent {
    orderId: string;
    status: OrderStatus;
    driver?: Driver;
    timestamp: string;
}
declare class APIClient {
    private baseURL;
    private token;
    private socket;
    constructor(baseURL?: string);
    setToken(token: string | null): void;
    getToken(): string | null;
    private request;
    sendVerificationCode(phone: string): Promise<ApiResponse<{
        phone: string;
    }>>;
    verifyCode(phone: string, code: string): Promise<ApiResponse<AuthResult>>;
    getCurrentUser(): Promise<ApiResponse<User>>;
    logout(): Promise<ApiResponse<null>>;
    createOrder(input: CreateOrderInput): Promise<ApiResponse<Order>>;
    getOrders(): Promise<ApiResponse<Order[]>>;
    getOrder(id: string): Promise<ApiResponse<Order>>;
    cancelOrder(id: string): Promise<ApiResponse<Order>>;
    confirmBoarding(id: string): Promise<ApiResponse<Order>>;
    trackOrder(id: string): Promise<ApiResponse<{
        orderId: string;
        status: OrderStatus;
        driverLocation: Location | null;
        pickup: Location;
        destination: Location;
    }>>;
    getNearbyDrivers(lat: number, lng: number, radius?: number): Promise<ApiResponse<Driver[]>>;
    getDriver(id: string): Promise<ApiResponse<Driver>>;
    connectSocket(orderId?: string): void;
    disconnectSocket(): void;
    joinOrderRoom(orderId: string): void;
    leaveOrderRoom(orderId: string): void;
    onDriverLocation(callback: (data: DriverLocationEvent) => void): () => void;
    onOrderStatus(callback: (data: OrderStatusEvent) => void): () => void;
    emitDriverLocation(driverId: string, lat: number, lng: number): void;
    getStats(): Promise<ApiResponse<{
        todayOrders: number;
        activeDrivers: number;
        todayRevenue: number;
        avgWaitTime: number;
        orderTrend: Array<{
            time: string;
            orders: number;
            revenue: number;
        }>;
        driverDistribution: Array<{
            area: string;
            count: number;
            lat: number;
            lng: number;
        }>;
    }>>;
}
declare const apiClient: APIClient;

export { APIClient, type ApiResponse, type AuthResult, type CreateOrderInput, type Driver, type DriverLocationEvent, type Location, type Order, type OrderStatus, type OrderStatusEvent, type User, apiClient, APIClient as default };
