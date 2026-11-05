"use client";

import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode, type Ref } from "react";
import { Calculator, ChevronLeft, ChevronRight, X } from "lucide-react";
import styles from "@/app/(dashboard)/test/[sessionId]/exam-tools.module.css";

interface Props {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  closeButtonRef?: Ref<HTMLButtonElement>;
  children: ReactNode;
}

export function ExamCalculatorPanel({ open, onOpen, onClose, closeButtonRef, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ startX: number; lastX: number; width: number; wasOpen: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState<number | null>(null);

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || window.matchMedia("(min-width: 1280px)").matches) return;
    const width = panelRef.current?.getBoundingClientRect().width || Math.min(window.innerWidth - 32, 564);
    gesture.current = { startX: event.clientX, lastX: event.clientX, width, wasOpen: open };
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current) return;
    current.lastX = event.clientX;
    const distance = event.clientX - current.startX;
    if (Math.abs(distance) < 6) return;
    suppressClick.current = true;
    setOffset(Math.max(0, Math.min(current.width, (current.wasOpen ? 0 : current.width) + distance)));
  };
  const finishDrag = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current) return;
    const distance = event.clientX - current.startX;
    gesture.current = null;
    setOffset(null);
    if (Math.abs(distance) > Math.max(40, current.width * .15)) {
      suppressClick.current = true;
      if (distance < 0) onOpen();
      else onClose();
    }
  };
  const cancelDrag = () => {
    gesture.current = null;
    setOffset(null);
    suppressClick.current = false;
  };
  const activateHandle = (event?: MouseEvent<HTMLButtonElement>) => {
    if (suppressClick.current && event?.detail !== 0) { suppressClick.current = false; return; }
    onOpen();
  };
  const dragHandlers = { onPointerDown: startDrag, onPointerMove: moveDrag, onPointerUp: finishDrag, onPointerCancel: cancelDrag };

  return <>
    <button type="button" className={styles.calculatorHandle} data-open={open} aria-label="Pull calculator from right edge" aria-expanded={open} aria-controls="exam-calculator" title="Open calculator or drag left" onClick={activateHandle} {...dragHandlers}>
      <ChevronLeft size={18} /><Calculator size={16} /><span>Calculator</span>
    </button>
    <div ref={panelRef} id="exam-calculator" role="region" aria-label="Scientific calculator" aria-hidden={!open && offset === null} inert={!open && offset === null} data-open={open} data-dragging={offset !== null} style={offset === null ? undefined : { "--drawer-offset": `${offset}px` } as CSSProperties} className={styles.calculatorPanel}>
      <div className={styles.calculatorDragBar} {...dragHandlers}>
        <span className="text-xs font-medium text-muted-foreground">Calculator</span>
        <span className={styles.swipeHint}>Swipe right to hide</span>
        <button ref={closeButtonRef} type="button" onPointerDown={event => event.stopPropagation()} onClick={onClose} aria-label="Close scientific calculator" title="Hide calculator (Esc)" className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <ChevronRight className={styles.hideArrow} size={19} /><X className={styles.desktopClose} size={16} />
        </button>
      </div>
      {children}
    </div>
  </>;
}
