import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const authErrorRate = new Rate('authenticated_error_rate');
const ordersLatency = new Trend('auth_orders_latency');
const cartLatency = new Trend('auth_cart_latency');
const wishlistLatency = new Trend('auth_wishlist_latency');
const profileLatency = new Trend('auth_profile_latency');

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '15s', target: 15 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'authenticated_error_rate': ['rate<0.05'],
  },
};

export function setup() {
  if (AUTH_TOKEN) {
    return { token: AUTH_TOKEN };
  }

  const email = __ENV.TEST_USER_EMAIL || 'perfuser@example.com';
  const password = __ENV.TEST_USER_PASSWORD || 'PerfPassword123!';

  const loginRes = http.post(
    `${BASE_URL}/api/v1/users/login/`,
    JSON.stringify({ email: email, password: password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  let token = '';
  try {
    const data = JSON.parse(loginRes.body);
    token = data.access || '';
  } catch (e) {
    // ignore
  }

  return { token: token };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (data.token) {
    headers['Authorization'] = `Bearer ${data.token}`;
  }

  // 1. User Cart
  const t0Cart = Date.now();
  const resCart = http.get(`${BASE_URL}/api/v1/cart/`, { headers });
  cartLatency.add(Date.now() - t0Cart);
  const cartOk = check(resCart, {
    'auth cart 200': (r) => r.status === 200,
  });
  authErrorRate.add(!cartOk);

  // 2. User Wishlist
  const t0Wish = Date.now();
  const resWish = http.get(`${BASE_URL}/api/v1/wishlist/`, { headers });
  wishlistLatency.add(Date.now() - t0Wish);
  const wishOk = check(resWish, {
    'auth wishlist 200': (r) => r.status === 200,
  });
  authErrorRate.add(!wishOk);

  // 3. User Orders Listing
  const t0Orders = Date.now();
  const resOrders = http.get(`${BASE_URL}/api/v1/orders/`, { headers });
  ordersLatency.add(Date.now() - t0Orders);
  const ordersOk = check(resOrders, {
    'auth orders 200': (r) => r.status === 200,
  });
  authErrorRate.add(!ordersOk);

  // 4. User Profile
  const t0Prof = Date.now();
  const resProf = http.get(`${BASE_URL}/api/v1/users/profile/`, { headers });
  profileLatency.add(Date.now() - t0Prof);
  const profOk = check(resProf, {
    'auth profile 200': (r) => r.status === 200,
  });
  authErrorRate.add(!profOk);

  sleep(0.5);
}
