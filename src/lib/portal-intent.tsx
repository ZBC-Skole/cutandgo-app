import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

export type PortalIntent = "client" | "salon" | "admin";

type PortalIntentContextValue = {
  portalIntent: PortalIntent;
  setPortalIntent: (intent: PortalIntent) => void;
};

const PortalIntentContext = createContext<PortalIntentContextValue | null>(null);

export function PortalIntentProvider({ children }: { children: ReactNode }) {
  const [portalIntent, setPortalIntent] = useState<PortalIntent>("client");

  const value = useMemo(
    () => ({ portalIntent, setPortalIntent }),
    [portalIntent],
  );

  return (
    <PortalIntentContext.Provider value={value}>
      {children}
    </PortalIntentContext.Provider>
  );
}

export function usePortalIntent() {
  const context = useContext(PortalIntentContext);

  if (!context) {
    throw new Error("usePortalIntent must be used within PortalIntentProvider.");
  }

  return context;
}
