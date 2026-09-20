import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';

const cartFlowLatency = new Trend('cart_flow_total_latency');
const cartFlowErrors = new Rate('cart_flow_error_rate');

export const options = {
  stages: [
    { duration: '10s', target: 3 },
    { duration: '15s', target: 10 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'cart_flow_error_rate': ['rate<0.05'],
  },
};

const SAMPLE_PRODUCT_ID = '5b733c6d-de59-4bb9-8f0b-917df7a3fd06';

export default function () {
  const t0 = Date.now();

  group('Guest Cart Lifecycle', function () {
    // 1. Initial cart fetch
    const resGetCart = http.get(`${BASE_URL}/api/v1/cart/`);
    const getCartOk = check(resGetCart, { 'get cart 200': (r) => r.status === 200 });
    cartFlowErrors.add(!getCartOk);

    // 2. Add item to cart
    const addPayload = JSON.stringify({
      product_id: SAMPLE_PRODUCT_ID,
      quantity: 1,
    });
    const resAdd = http.post(`${BASE_URL}/api/v1/cart/items/`, addPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    const addOk = check(resAdd, {
      'add cart item 201': (r) => r.status === 201,
    });
    cartFlowErrors.add(!addOk);

    let itemId = null;
    try {
      const data = JSON.parse(resAdd.body);
      if (data.items && data.items.length > 0) {
        itemId = data.items[0].id;
      }
    } catch (e) {
      // ignore
    }

    sleep(0.3);

    // 3. Update quantity if item was found
    if (itemId) {
      const updatePayload = JSON.stringify({ quantity: 2 });
      const resUpdate = http.patch(`${BASE_URL}/api/v1/cart/items/${itemId}/`, updatePayload, {
        headers: { 'Content-Type': 'application/json' },
      });
      const updateOk = check(resUpdate, {
        'update cart item 200': (r) => r.status === 200,
      });
      cartFlowErrors.add(!updateOk);

      sleep(0.3);

      // 4. Delete item to restore clean state (returns 200 with updated cart)
      const resDel = http.del(`${BASE_URL}/api/v1/cart/items/${itemId}/`);
      const delOk = check(resDel, {
        'delete cart item 200': (r) => r.status === 200,
      });
      cartFlowErrors.add(!delOk);
    }
  });

  cartFlowLatency.add(Date.now() - t0);
  sleep(0.5);
}
