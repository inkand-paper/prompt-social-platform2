// src/hooks/useFeed.js
// React Query hook for paginated prompt feed with infinite-scroll support.

import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchExploreFeed, fetchTrendingFeed } from '../lib/feedApi'

export function useFeed({ type = 'all', sort = 'new', category = '' }) {
  return useInfiniteQuery({
    queryKey: ['feed', 'explore', type, sort, category],
    queryFn: ({ pageParam = 1 }) => fetchExploreFeed({ page: pageParam, type, sort, category }),
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
    staleTime: 1000 * 60 * 2,
  })
}

export function useTrending({ period = '7d' }) {
  return useInfiniteQuery({
    queryKey: ['feed', 'trending', period],
    queryFn: ({ pageParam = 1 }) => fetchTrendingFeed({ page: pageParam, period }),
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
    staleTime: 1000 * 60 * 5,
  })
}
