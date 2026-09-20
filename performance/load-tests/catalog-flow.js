import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';

const catalogFlowLatency = new Trend('catalog_flow_total_latency');
const catalogFlowErrors = new Rate('catalog_flow_error_rate');

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 15 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1500'],
    'catalog_flow_error_rate': ['rate<0.05'],
  },
};

export default function () {
  const t0 = Date.now();

  group('Browse Catalog Flow', function () {
    // 1. Visit Category Tree
    const resTree = http.get(`${BASE_URL}/api/v1/categories/tree/`);
    const treeOk = check(resTree, { 'category tree 200': (r) => r.status === 200 });
    catalogFlowErrors.add(!treeOk);
    sleep(0.3);

    // 2. Filter Products by is_featured
    const resFeatured = http.get(`${BASE_URL}/api/v1/products/?is_featured=true`);
    const featOk = check(resFeatured, { 'featured products 200': (r) => r.status === 200 });
    catalogFlowErrors.add(!featOk);
    sleep(0.5);

    // 3. Filter Products by search term
    const resSearch = http.get(`${BASE_URL}/api/v1/products/?search=penrose`);
    const searchOk = check(resSearch, { 'search products 200': (r) => r.status === 200 });
    catalogFlowErrors.add(!searchOk);
    sleep(0.5);

    // 4. Inspect Product Detail
    const resDetail = http.get(`${BASE_URL}/api/v1/products/penrose-desk-mat/`);
    const detailOk = check(resDetail, { 'product detail 200': (r) => r.status === 200 });
    catalogFlowErrors.add(!detailOk);
    sleep(0.5);

    // 5. Inspect Reviews for that product
    const resReviews = http.get(`${BASE_URL}/api/v1/reviews/product/a446d7aa-1cb5-40df-ac09-67e15b26def8/`);
    const reviewsOk = check(resReviews, { 'product reviews 200': (r) => r.status === 200 });
    catalogFlowErrors.add(!reviewsOk);
  });

  catalogFlowLatency.add(Date.now() - t0);
  sleep(1);
}
