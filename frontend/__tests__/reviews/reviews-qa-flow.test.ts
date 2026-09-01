import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reviewsApi, questionsApi } from '@/lib/api/endpoints';
import { adminApi } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Reviews & Q&A Frontend API Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reviewsApi client tests', () => {
    it('fetches product reviews with filter and sort parameters', async () => {
      const mockData = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 'rev-1',
            rating: 5,
            title: 'Exceptional craftsmanship',
            body: 'Very durable and elegant.',
            is_verified_purchase: true,
            helpful_count: 3,
            unhelpful_count: 0,
            images: [],
            created_at: '2026-09-01T12:00:00Z',
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

      const res = await reviewsApi.getByProduct('prod-1', {
        rating: 5,
        verified: true,
        sort: 'helpful',
        page: 1,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/reviews/product/prod-1/', {
        params: { rating: 5, verified: true, sort: 'helpful', page: 1 },
      });
      expect(res.results).toHaveLength(1);
      expect(res.results[0].rating).toBe(5);
    });

    it('fetches review summary with rating breakdown', async () => {
      const mockSummary = {
        product_id: 'prod-1',
        total_reviews: 10,
        average_rating: 4.8,
        verified_purchases_count: 8,
        with_images_count: 4,
        rating_breakdown: {
          '5': { stars: 5, count: 8, percentage: 80 },
          '4': { stars: 4, count: 2, percentage: 20 },
          '3': { stars: 3, count: 0, percentage: 0 },
          '2': { stars: 2, count: 0, percentage: 0 },
          '1': { stars: 1, count: 0, percentage: 0 },
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockSummary });

      const summary = await reviewsApi.getSummary('prod-1');

      expect(apiClient.get).toHaveBeenCalledWith('/reviews/product/prod-1/summary/');
      expect(summary.average_rating).toBe(4.8);
      expect(summary.rating_breakdown['5'].count).toBe(8);
    });

    it('fetches review eligibility for verified buyer check', async () => {
      const mockEligibility = {
        can_review: true,
        has_purchased: true,
        has_reviewed: false,
        existing_review: null,
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockEligibility });

      const eligibility = await reviewsApi.getEligibility('prod-1');

      expect(apiClient.get).toHaveBeenCalledWith('/reviews/product/prod-1/eligibility/');
      expect(eligibility.can_review).toBe(true);
      expect(eligibility.has_purchased).toBe(true);
    });

    it('submits a new review with multipart/form-data headers', async () => {
      const formData = new FormData();
      formData.append('product_id', 'prod-1');
      formData.append('rating', '5');
      formData.append('body', 'Incredible quality.');

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { id: 'rev-new', rating: 5, body: 'Incredible quality.' },
      });

      const result = await reviewsApi.create(formData);

      expect(apiClient.post).toHaveBeenCalledWith('/reviews/create/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(result.id).toBe('rev-new');
    });

    it('submits a helpful vote on a review', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { user_vote: true, helpful_count: 5, unhelpful_count: 1 },
      });

      const voteResult = await reviewsApi.vote('rev-1', true);

      expect(apiClient.post).toHaveBeenCalledWith('/reviews/rev-1/vote/', {
        is_helpful: true,
      });
      expect(voteResult.helpful_count).toBe(5);
      expect(voteResult.user_vote).toBe(true);
    });

    it('submits an abuse report on a review', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { detail: 'Report filed successfully.' },
      });

      const reportResult = await reviewsApi.report('rev-1', 'SPAM', 'Commercial advertisement');

      expect(apiClient.post).toHaveBeenCalledWith('/reviews/rev-1/report/', {
        reason: 'SPAM',
        details: 'Commercial advertisement',
      });
      expect(reportResult.detail).toBe('Report filed successfully.');
    });
  });

  describe('questionsApi client tests', () => {
    it('fetches product inquiries and questions', async () => {
      const mockQuestions = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 'q-1',
            product: 'prod-1',
            user_display_name: 'Amir K.',
            question: 'What is the exact water resistance depth?',
            answer: {
              id: 'ans-1',
              staff_name: 'Paradox Atelier',
              answer: 'Tested up to 50 meters depth under ISO specifications.',
              is_official: true,
              created_at: '2026-09-01T13:00:00Z',
              updated_at: '2026-09-01T13:00:00Z',
            },
            created_at: '2026-09-01T12:30:00Z',
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockQuestions });

      const res = await questionsApi.getByProduct('prod-1', { page: 1 });

      expect(apiClient.get).toHaveBeenCalledWith('/reviews/questions/product/prod-1/', {
        params: { page: 1 },
      });
      expect(res.results).toHaveLength(1);
      expect(res.results[0].answer?.staff_name).toBe('Paradox Atelier');
    });

    it('creates a new technical question', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { id: 'q-new', question: 'Does it support inductive charging?' },
      });

      const res = await questionsApi.create({
        product_id: 'prod-1',
        question: 'Does it support inductive charging?',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/reviews/questions/create/', {
        product_id: 'prod-1',
        question: 'Does it support inductive charging?',
      });
      expect(res.id).toBe('q-new');
    });
  });

  describe('admin moderation API client tests', () => {
    it('moderates a review with rejection reason', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { id: 'rev-1', status: 'REJECTED', rejection_reason: 'Contains profanity' },
      });

      const res = await adminApi.moderateReview('rev-1', {
        status: 'REJECTED',
        rejection_reason: 'Contains profanity',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/admin/reviews/rev-1/moderate/', {
        status: 'REJECTED',
        rejection_reason: 'Contains profanity',
      });
      expect(res.status).toBe('REJECTED');
    });

    it('attaches official staff response to a review', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { id: 'resp-1', response_text: 'Thank you for your patronage.' },
      });

      const res = await adminApi.respondToReview('rev-1', 'Thank you for your patronage.');

      expect(apiClient.post).toHaveBeenCalledWith('/admin/reviews/rev-1/respond/', {
        response_text: 'Thank you for your patronage.',
      });
      expect(res.response_text).toBe('Thank you for your patronage.');
    });

    it('answers an inquiry as staff', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { id: 'ans-1', answer: 'Yes, fully compatible.' },
      });

      const res = await adminApi.answerQuestion('q-1', 'Yes, fully compatible.');

      expect(apiClient.post).toHaveBeenCalledWith('/admin/questions/q-1/answer/', {
        answer: 'Yes, fully compatible.',
      });
      expect(res.answer).toBe('Yes, fully compatible.');
    });

    it('resolves an abuse report', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { id: 'rep-1', status: 'RESOLVED' },
      });

      const res = await adminApi.resolveReviewReport('rep-1', 'RESOLVED');

      expect(apiClient.post).toHaveBeenCalledWith('/admin/reviews/reports/rep-1/resolve/', {
        status: 'RESOLVED',
      });
      expect(res.status).toBe('RESOLVED');
    });
  });
});
