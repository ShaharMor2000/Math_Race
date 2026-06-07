package com.mathrace.service;

import com.mathrace.exception.ApiException;
import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitService {

    private static final int MAX_REQUESTS = 8;
    private static final long WINDOW_MS = 10_000L;

    private final Map<String, Deque<Long>> buckets = new ConcurrentHashMap<>();

    public void checkAnswerRate(Long participantId) {
        String key = "answer:" + participantId;
        long now = System.currentTimeMillis();
        Deque<Long> window = buckets.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && now - window.peekFirst() > WINDOW_MS) {
                window.pollFirst();
            }
            if (window.size() >= MAX_REQUESTS) {
                throw new ApiException("RATE_LIMITED", "Too many answer submissions. Slow down.");
            }
            window.addLast(now);
        }
    }
}
