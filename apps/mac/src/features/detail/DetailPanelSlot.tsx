import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const DetailPanelTargetContext = createContext<HTMLElement | null>(null);
const DetailPanelSetTargetContext = createContext<
  (node: HTMLElement | null) => void
>(() => {});
const DetailPanelMenuContext = createContext<HTMLElement | null>(null);
const DetailPanelSetMenuContext = createContext<
  (node: HTMLElement | null) => void
>(() => {});

export function DetailPanelSlot({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  return (
    <DetailPanelSetTargetContext.Provider value={setTarget}>
      <DetailPanelTargetContext.Provider value={target}>
        <DetailPanelSetMenuContext.Provider value={setMenu}>
          <DetailPanelMenuContext.Provider value={menu}>
            {children}
          </DetailPanelMenuContext.Provider>
        </DetailPanelSetMenuContext.Provider>
      </DetailPanelTargetContext.Provider>
    </DetailPanelSetTargetContext.Provider>
  );
}

export function DetailPanelTarget({ className }: { className?: string }) {
  const setTarget = useContext(DetailPanelSetTargetContext);
  return <div ref={setTarget} className={className} />;
}

export function DetailPanelBody({ children }: { children: ReactNode }) {
  const target = useContext(DetailPanelTargetContext);
  if (!target) return null;
  return createPortal(children, target);
}

export function DetailPanelMenuTarget({ className }: { className?: string }) {
  const setMenu = useContext(DetailPanelSetMenuContext);
  return <div ref={setMenu} className={className} />;
}

export function DetailPanelMenuBody({ children }: { children: ReactNode }) {
  const menu = useContext(DetailPanelMenuContext);
  if (!menu) return null;
  return createPortal(children, menu);
}
