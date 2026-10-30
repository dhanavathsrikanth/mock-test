"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  Notification,
  NotificationListResponse,
  NotificationCounts,
  NotificationFilters,
} from "@/types/notifications";
import { NOTIFICATION_POLL_INTERVAL_MS } from "@/lib/notifications/constants";

interface UseNotificationsOptions {
  pageSize?: number;
  pollInterval?: number;
  autoRefresh?: boolean;
  filters?: NotificationFilters;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    pageSize = 20,
    pollInterval = NOTIFICATION_POLL_INTERVAL_MS,
    autoRefresh = true,
    filters = {},
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<NotificationCounts | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Depend on filter values, not the caller's object identity. Inline/default
  // objects otherwise restart the initial-fetch effect after every response.
  const filterType = Array.isArray(filters.type) ? filters.type.join(",") : filters.type;
  const filterIsRead = filters.is_read;
  const filterSearch = filters.search;
  const filterPriority = filters.priority;
  const filterGroupKey = filters.group_key;

  const fetchNotifications = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams();
        params.set("page", String(pageNum));
        params.set("limit", String(pageSize));

        if (filterType) params.set("type", filterType);
        if (filterIsRead !== undefined) params.set("is_read", String(filterIsRead));
        if (filterSearch) params.set("search", filterSearch);
        if (filterPriority) params.set("priority", filterPriority);
        if (filterGroupKey) params.set("group_key", filterGroupKey);

        const res = await fetch(`/api/notifications?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");

        const data: NotificationListResponse = await res.json();

        if (append) {
          setNotifications((prev) => [...prev, ...data.notifications]);
        } else {
          setNotifications(data.notifications);
        }

        setTotal(data.total);
        setUnreadCount(data.unread_count);
        setHasMore(data.has_more);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [pageSize, filterType, filterIsRead, filterSearch, filterPriority, filterGroupKey]
  );

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const data: NotificationCounts = await res.json();
        setCounts(data);
        setUnreadCount(data.unread);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  }, [loadingMore, hasMore, page, fetchNotifications]);

  const refresh = useCallback(() => {
    setPage(1);
    fetchNotifications(1, false);
    fetchCounts();
  }, [fetchNotifications, fetchCounts]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await fetch(`/api/notifications/${notificationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_read: true }),
        });

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Failed to mark as read:", err);
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }, []);

  const archiveNotification = useCallback(
    async (notificationId: string) => {
      try {
        await fetch(`/api/notifications/${notificationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "archived" }),
        });
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setTotal((prev) => prev - 1);
      } catch (err) {
        console.error("Failed to archive:", err);
      }
    },
    []
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await fetch(`/api/notifications/${notificationId}`, {
          method: "DELETE",
        });
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setTotal((prev) => prev - 1);
      } catch (err) {
        console.error("Failed to delete:", err);
      }
    },
    []
  );

  const undoDelete = useCallback(
    async (notificationId: string) => {
      try {
        await fetch(`/api/notifications/${notificationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "restored" }),
        });
        refresh();
      } catch (err) {
        console.error("Failed to restore:", err);
      }
    },
    [refresh]
  );

  useEffect(() => {
    fetchNotifications(1, false);
    fetchCounts();
  }, [fetchNotifications, fetchCounts]);

  useEffect(() => {
    if (!autoRefresh) return;

    intervalRef.current = setInterval(() => {
      fetchCounts();
    }, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, pollInterval, fetchCounts]);

  return {
    notifications,
    total,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    counts,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    undoDelete,
    fetchNotifications,
  };
}
