"use client";

import { useId, useState, useMemo } from 'react';
import {
  Search,
  X,
  Check,
  ChevronDown,
  BookOpen,
  Layers,
  Calendar,
  Clock,
  SlidersHorizontal,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import styles from './filters.module.css';

export type FilterOption = { value: string; label: string; description?: string };
type Props = {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  emptyLabel?: string;
  single?: boolean;
  disabled?: boolean;
  searchable?: boolean;
};

function getFilterIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes('subject')) return BookOpen;
  if (l.includes('topic')) return Layers;
  if (l.includes('year')) return Calendar;
  if (l.includes('time') || l.includes('timer') || l.includes('timing')) return Clock;
  if (l.includes('question') || l.includes('count') || l.includes('number')) return SlidersHorizontal;
  return Filter;
}

export function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  emptyLabel = 'Choose options',
  single = false,
  disabled = false,
  searchable = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const id = useId();
  const Icon = getFilterIcon(label);

  const visible = useMemo(
    () =>
      options.filter(option =>
        `${option.label} ${option.description ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase().trim())
      ),
    [options, search]
  );

  const allSelected = options.length > 0 && options.every(option => selected.includes(option.value));
  const hasSelection = selected.length > 0;
  const first = options.find(option => selected.includes(option.value));
  const summary = first ? first.label : emptyLabel;

  function toggle(value: string) {
    if (single) {
      onChange([value]);
      setOpen(false);
      return;
    }
    onChange(
      selected.includes(value)
        ? selected.filter(item => item !== value)
        : [...selected, value]
    );
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange([]);
  }

  return (
    <div className={cn(styles.field, "min-w-0")}>
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <label
          id={`${id}-label`}
          className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5 cursor-pointer select-none"
          onClick={() => !disabled && setOpen(!open)}
        >
          <Icon className="h-3.5 w-3.5 text-primary" />
          <span>{label}</span>
        </label>
        {hasSelection && !single && (
          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
            {selected.length} of {options.length} selected
          </span>
        )}
      </div>

      <Popover
        open={open}
        onOpenChange={value => {
          setOpen(value);
          if (!value) setSearch('');
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-labelledby={`${id}-label ${id}-value`}
            className={cn(
              "group relative w-full h-12 px-3.5 flex items-center justify-between rounded-xl border text-sm font-normal transition-all",
              "bg-card/90 shadow-[0_1px_2px_0_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[0_1px_2px_0_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
              "hover:border-primary/50 hover:bg-card hover:shadow-xs",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary",
              open
                ? "border-primary ring-2 ring-primary/20 bg-background"
                : "border-border/80",
              disabled && "opacity-50 cursor-not-allowed hover:border-border hover:bg-card",
              hasSelection && !open && "border-primary/40 bg-primary/[0.03]"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all",
                  hasSelection
                    ? "bg-primary text-primary-foreground border-primary/30 shadow-2xs"
                    : "bg-muted/80 text-muted-foreground border-border/40 group-hover:text-foreground group-hover:border-border/80"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span
                id={`${id}-value`}
                className={cn(
                  "truncate text-left text-sm",
                  hasSelection ? "font-medium text-foreground" : "font-normal text-muted-foreground"
                )}
              >
                {summary}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              {selected.length > 1 && (
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                  +{selected.length - 1}
                </span>
              )}
              {hasSelection && !single && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClear(e as unknown as React.MouseEvent);
                    }
                  }}
                  title="Clear selection"
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180 text-primary"
                )}
              />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          collisionPadding={12}
          sideOffset={6}
          style={{ width: 'var(--radix-popover-trigger-width)' }}
          className={cn(
            "relative w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[calc(100vw-24px)] p-0 rounded-2xl overflow-hidden z-50",
            // Solid opaque surface prevents underlying button/element blur bleed
            "bg-white dark:bg-slate-900 text-popover-foreground border border-border/80 dark:border-white/10",
            // Dual specular rim & ambient depth shadow for high-end glassmorphic feel without transparency
            "shadow-[0_20px_50px_-10px_rgba(0,0,0,0.18),0_8px_20px_-6px_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(255,255,255,0.4)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.14),inset_0_0_0_1px_rgba(255,255,255,0.06)]",
            "animate-in fade-in-0 zoom-in-95 duration-150"
          )}
          aria-label={`${label} options`}
        >
          {/* Subtle frosted specular glow strip */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/[0.04] via-primary/[0.01] to-transparent" />

          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 border border-primary/20 text-primary">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {single ? 'Choose' : 'Select'} {label}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {single ? 'Choose one option' : `${selected.length} of ${options.length} selected`}
                </p>
              </div>
            </div>
            {!single && hasSelection && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors shrink-0 px-1 py-0.5"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Search Bar */}
          {searchable && (
            <div className="relative p-2.5 border-b border-border/50 bg-background/60">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  aria-label={`Search ${label.toLowerCase()}`}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  className="h-8.5 pl-8 pr-7 text-xs bg-muted/30 border-border/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] focus-visible:ring-1 focus-visible:ring-primary rounded-lg"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                    className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bulk Action Bar (Multi-select only) */}
          {!single && (
            <div className="relative flex items-center justify-between border-b border-border/50 px-4 py-1.5 bg-muted/20 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange(options.map(option => option.value))}
                  disabled={allSelected || !options.length}
                  className="text-xs font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  Select all
                </button>
                <span className="text-muted-foreground/30">·</span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  disabled={!hasSelection}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {visible.length} {visible.length === 1 ? 'option' : 'options'}
              </span>
            </div>
          )}

          {/* Options List with Refined Scrollbar */}
          <div
            className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 bg-white dark:bg-slate-900 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30"
            role={single ? 'radiogroup' : 'group'}
            aria-label={label}
          >
            {visible.map(option => {
              const isSelected = selected.includes(option.value);
              return (
                <label
                  key={option.value}
                  data-selected={isSelected}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl p-2.5 text-xs cursor-pointer transition-all duration-150 select-none",
                    "hover:bg-muted/70",
                    isSelected
                      ? "bg-primary/10 border border-primary/20 text-foreground font-medium shadow-2xs hover:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {single ? (
                      <input
                        type="radio"
                        name={id}
                        checked={isSelected}
                        onChange={() => toggle(option.value)}
                        className="accent-primary h-4 w-4 shrink-0 cursor-pointer"
                      />
                    ) : (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggle(option.value)}
                        className="h-4 w-4 rounded-md cursor-pointer data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "block text-xs leading-snug break-words",
                        isSelected ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                      )}
                    >
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="block text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                        {option.description}
                      </span>
                    )}
                  </div>
                  {single && isSelected && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  )}
                </label>
              );
            })}
            {!visible.length && (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                <p>No matching {label.toLowerCase()}.</p>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="text-primary hover:underline text-[11px] font-medium"
                  >
                    Clear search query
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer (Multi-select) */}
          {!single && (
            <div className="relative flex items-center justify-between border-t border-border/60 bg-muted/40 px-3.5 py-2.5">
              <span className="text-[11px] text-muted-foreground truncate mr-2">
                {selected.length ? `${selected.length} selected` : emptyLabel}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-7.5 px-3.5 text-xs font-semibold rounded-lg shadow-2xs hover:shadow-xs"
              >
                Done
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
