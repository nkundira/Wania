import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type UiContextValue = {
  assistantOpen: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  tourOpen: boolean;
  tourStep: number;
  startTour: (step?: number) => void;
  stopTour: () => void;
  setTourStep: (step: number) => void;
  welcomeOpen: boolean;
  openWelcome: () => void;
  closeWelcome: () => void;
};

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  const startTour = useCallback((step = 0) => {
    setTourStep(step);
    setTourOpen(true);
  }, []);

  const stopTour = useCallback(() => setTourOpen(false), []);

  const value = useMemo<UiContextValue>(
    () => ({
      assistantOpen,
      openAssistant: () => setAssistantOpen(true),
      closeAssistant: () => setAssistantOpen(false),
      toggleAssistant: () => setAssistantOpen((open) => !open),
      tourOpen,
      tourStep,
      startTour,
      stopTour,
      setTourStep,
      welcomeOpen,
      openWelcome: () => setWelcomeOpen(true),
      closeWelcome: () => setWelcomeOpen(false),
    }),
    [assistantOpen, tourOpen, tourStep, startTour, stopTour, welcomeOpen]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside UiProvider');
  return ctx;
}
