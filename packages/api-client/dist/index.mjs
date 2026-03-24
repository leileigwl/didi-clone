// src/index.ts
import { io } from "socket.io-client";
var APIClient = class {
  constructor(baseURL = "http://localhost:3000") {
    this.token = null;
    this.socket = null;
    this.baseURL = baseURL;
  }
  // Set auth token
  setToken(token) {
    this.token = token;
    if (token && this.socket) {
      this.socket.auth = { token };
    }
  }
  // Get current token
  getToken() {
    return this.token;
  }
  // Generic request method
  async request(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    const response = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers
    });
    const data = await response.json();
    return data;
  }
  // Auth API
  async sendVerificationCode(phone) {
    return this.request("/api/auth/send-code", {
      method: "POST",
      body: JSON.stringify({ phone })
    });
  }
  async verifyCode(phone, code) {
    const response = await this.request("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code })
    });
    if (response.code === 0 && response.data.token) {
      this.setToken(response.data.token);
    }
    return response;
  }
  async getCurrentUser() {
    return this.request("/api/auth/me");
  }
  async logout() {
    const response = await this.request("/api/auth/logout", {
      method: "POST"
    });
    this.setToken(null);
    return response;
  }
  // Driver Auth API
  async driverLogin(phone, password) {
    const response = await this.request("/api/driver/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password })
    });
    if (response.code === 0 && response.data.token) {
      this.setToken(response.data.token);
    }
    return response;
  }
  async driverSendCode(phone) {
    return this.request("/api/driver/auth/send-code", {
      method: "POST",
      body: JSON.stringify({ phone })
    });
  }
  async driverVerifyCode(phone, code) {
    const response = await this.request("/api/driver/auth/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code })
    });
    if (response.code === 0 && response.data.token) {
      this.setToken(response.data.token);
    }
    return response;
  }
  async getDriverInfo() {
    return this.request("/api/driver/auth/me");
  }
  async driverLogout() {
    const response = await this.request("/api/driver/auth/logout", {
      method: "POST"
    });
    this.setToken(null);
    return response;
  }
  // Orders API
  async createOrder(input) {
    return this.request("/api/orders", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
  async getOrders() {
    return this.request("/api/orders");
  }
  async getOrder(id) {
    return this.request(`/api/orders/${id}`);
  }
  async cancelOrder(id) {
    return this.request(`/api/orders/${id}/cancel`, {
      method: "PUT"
    });
  }
  async confirmBoarding(id) {
    return this.request(`/api/orders/${id}/confirm-boarding`, {
      method: "PUT"
    });
  }
  async trackOrder(id) {
    return this.request(`/api/orders/${id}/track`);
  }
  // Drivers API
  async getNearbyDrivers(lat, lng, radius) {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      ...radius && { radius: radius.toString() }
    });
    return this.request(`/api/drivers/nearby?${params}`);
  }
  async getDriver(id) {
    return this.request(`/api/drivers/${id}`);
  }
  // Socket connection
  connectSocket(orderId) {
    if (this.socket?.connected) {
      if (orderId) {
        this.socket.emit("join:order", orderId);
      }
      return;
    }
    this.socket = io(this.baseURL, {
      auth: this.token ? { token: this.token } : void 0,
      transports: ["websocket"]
    });
    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
      if (orderId) {
        this.socket?.emit("join:order", orderId);
      }
    });
    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
  }
  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  // Socket room management
  joinOrderRoom(orderId) {
    if (!this.socket) {
      this.connectSocket(orderId);
    } else {
      this.socket.emit("join:order", orderId);
    }
  }
  leaveOrderRoom(orderId) {
    this.socket?.emit("leave:order", orderId);
  }
  // Socket event listeners
  onDriverLocation(callback) {
    if (!this.socket) this.connectSocket();
    this.socket?.on("driver:location", callback);
    return () => this.socket?.off("driver:location", callback);
  }
  onOrderStatus(callback) {
    if (!this.socket) this.connectSocket();
    this.socket?.on("order:status", callback);
    return () => this.socket?.off("order:status", callback);
  }
  // Driver-specific socket events (for driver app)
  emitDriverLocation(driverId, lat, lng) {
    if (!this.socket) this.connectSocket();
    this.socket?.emit("driver:location", { driverId, lat, lng });
  }
  // Admin API
  async getStats() {
    return this.request("/api/admin/stats");
  }
};
var apiClient = new APIClient();
var index_default = APIClient;
export {
  APIClient,
  apiClient,
  index_default as default
};
