import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';

const errorRate = new Rate('error_rate');
const productListLatency = new Trend('product_list_latency');
const productDetailLatency = new Trend('product_detail_latency');
const categoryTreeLatency = new Trend('category_tree_latency');

export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Stage A: 5 VUs
    { duration: '15s', target: 10 },  // Stage B: 10 VUs
    { duration: '15s', target: 25 },  // Stage C: 25 VUs
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // 95% of requests must complete below 1s
    'error_rate': ['rate<0.05'],         // Error rate below 5%
  },
};

const SAMPLE_SLUGS = [
  'isomorphic-ceramic-vessel',
  'monolith-precision-pen',
  'penrose-desk-mat',
  'anodized-machined-keypad',
  'impossible-prism-crystal',
  'penrose-chronograph-titanium',
];

const SAMPLE_PRODUCT_ID = '5b733c6d-de59-4bb9-8f0b-917df7a3fd06';

export default function () {
  // 1. Health check
  const resHealth = http.get(`${BASE_URL}/api/v1/health/`);
  const healthOk = check(resHealth, {
    'health status 200': (r) => r.status === 200,
  });
  errorRate.add(!healthOk);

  // 2. Product list
  const t0List = Date.now();
  const resList = http.get(`${BASE_URL}/api/v1/products/`);
  productListLatency.add(Date.now() - t0List);
  const listOk = check(resList, {
    'product list 200': (r) => r.status === 200,
    'product list has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.results) || Array.isArray(body);
      } catch (e) {
        return false;
      }
    },
  });
  errorRate.add(!listOk);

  // 3. Category Tree
  const t0Tree = Date.now();
  const resTree = http.get(`${BASE_URL}/api/v1/categories/tree/`);
  categoryTreeLatency.add(Date.now() - t0Tree);
  const treeOk = check(resTree, {
    'category tree 200': (r) => r.status === 200,
  });
  errorRate.add(!treeOk);

  // 4. Random Product detail
  const randomSlug = SAMPLE_SLUGS[Math.floor(Math.random() * SAMPLE_SLUGS.length)];
  const t0Detail = Date.now();
  const resDetail = http.get(`${BASE_URL}/api/v1/products/${randomSlug}/`);
  productDetailLatency.add(Date.now() - t0Detail);
  const detailOk = check(resDetail, {
    'product detail 200': (r) => r.status === 200,
    'product detail matches slug': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.slug === randomSlug;
      } catch (e) {
        return false;
      }
    },
  });
  errorRate.add(!detailOk);

  // 5. Review Summary
  const resReviewSummary = http.get(`${BASE_URL}/api/v1/reviews/product/${SAMPLE_PRODUCT_ID}/summary/`);
  const reviewOk = check(resReviewSummary, {
    'review summary 200': (r) => r.status === 200,
  });
  errorRate.add(!reviewOk);

  // 6. Shipping Methods
  const resShipping = http.get(`${BASE_URL}/api/v1/shipping/methods/`);
  const shippingOk = check(resShipping, {
    'shipping methods 200': (r) => r.status === 200,
  });
  errorRate.add(!shippingOk);

  // 7. Active Promotions
  const resPromos = http.get(`${BASE_URL}/api/v1/promotions/`);
  const promoOk = check(resPromos, {
    'promotions 200': (r) => r.status === 200,
  });
  errorRate.add(!promoOk);

  sleep(0.5);
}
