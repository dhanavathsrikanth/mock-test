"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Button } from "./button";
import { AlertTriangle } from "lucide-react";

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  confirmDialog: (opts: { title: string; message: string; confirmLabel?: string; destructive?: boolean }) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({ confirmDialog: async () => false });

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirmDialog = useCallback(
    (opts: { title: string; message: string; confirmLabel?: string; destructive?: boolean }) =>
      new Promise<boolean>((resolve) => {
        setState({ open: true, ...opts, resolve });
      }),
    []
  );

  const handleClose = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirmDialog }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => handleClose(false)} />
          <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-semibold text-base">{state.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{state.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
              <Button variant={state.destructive ? "destructive" : "default"} onClick={() => handleClose(true)}>
                {state.confirmLabel || "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
