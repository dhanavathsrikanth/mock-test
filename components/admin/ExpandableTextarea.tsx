"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, X } from "lucide-react";

interface ExpandableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  label?: string;
  required?: boolean;
}

export function ExpandableTextarea({
  value,
  onChange,
  placeholder,
  className = "",
  minHeight = "min-h-[100px]",
  label,
  required,
}: ExpandableTextareaProps) {
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const expandedRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (expanded && expandedRef.current) {
      expandedRef.current.focus();
      expandedRef.current.selectionStart = expandedRef.current.value.length;
    }
  }, [expanded]);

  useEffect(() => {
    if (expanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [expanded]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && expanded) {
      setExpanded(false);
    }
  };

  const textarea = (
    <textarea
      ref={expanded ? expandedRef : textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none whitespace-pre-wrap ${minHeight} ${className}`}
      required={required}
    />
  );

  return (
    <>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-xs font-medium">
              {label}
              {required && <span className="text-destructive ml-0.5">*</span>}
            </label>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(true)}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {textarea}
      </div>

      {expanded && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              {label && <h3 className="font-semibold text-sm">{label}</h3>}
              {required && <span className="text-destructive text-xs">*required</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {value.length} characters
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(false)}
                className="gap-1.5"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                Collapse
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setExpanded(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <textarea
              ref={expandedRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full h-full min-h-[300px] rounded-lg border border-input bg-background px-4 py-3 text-sm resize-none whitespace-pre-wrap"
              autoFocus
            />
          </div>
          <div className="border-t px-4 py-3 flex items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={() => setExpanded(false)}
              className="gap-1.5"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              Done
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
