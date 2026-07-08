"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Search,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationItem } from "./NotificationItem";
import { NotificationSkeleton } from "./NotificationSkeleton";
import { NotificationEmpty } from "./NotificationEmpty";
import { NOTIFICATION_CATEGORIES, type NotificationCategory } from "@/types/notifications";

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    undoDelete,
  } = useNotifications({ pageSize: 20, autoRefresh: true });

  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletedId, setDeletedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredNotifications = notifications.filter((notif) => {
    if (activeCategory === "unread") return !notif.is_read;
    if (activeCategory === "all") return true;
    return notif.type === activeCategory;
  });

  const handleSearch = useCallback(
    () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        refresh();
      }, 300);
    },
    [refresh]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletedId(id);
      await deleteNotification(id);

      setTimeout(() => {
        setDeletedId(null);
      }, 5000);
    },
    [deleteNotification]
  );

  const handleUndoDelete = useCallback(
    async (id: string) => {
      setDeletedId(null);
      await undoDelete(id);
    },
    [undoDelete]
  );

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      if (
        scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 100 &&
        hasMore &&
        !loadingMore
      ) {
        loadMore();
      }
    };

    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [hasMore, loadingMore, loadMore]);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              className="text-xs gap-1 h-8"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refresh()}
            className="h-8 w-8 p-0"
          >
            <Loader2 className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="px-4 py-2 border-b">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch();
              }}
              className="pl-9 h-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  handleSearch();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <span className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground inline-block">&times;</span>
              </button>
            )}
        </div>
      </div>

      <div className="flex gap-1 px-4 py-2 border-b overflow-x-auto scrollbar-none">
        {NOTIFICATION_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              activeCategory === cat.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <NotificationEmpty
            type={activeCategory === "unread" ? "unread" : "all"}
          />
        ) : (
          <div className="divide-y">
            {filteredNotifications.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onMarkRead={markAsRead}
                onArchive={archiveNotification}
                onDelete={handleDelete}
                onUndoDelete={handleUndoDelete}
                isDeleted={deletedId === notif.id}
              />
            ))}
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
