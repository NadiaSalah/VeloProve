import { http, HttpResponse } from 'msw';

export const handlers = [
  // Default fallback mock handler
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok', mocked: true });
  }),
];
