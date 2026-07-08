export function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 animate-pulse">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-2.5 bg-muted rounded w-1/4" />
      </div>
    </div>
  );
}
