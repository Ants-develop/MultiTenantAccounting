import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type LayoutMode = "simple" | "advanced";

interface LayoutContextType {
    layoutMode: LayoutMode;
    setLayoutMode: (mode: LayoutMode) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
    const [layoutMode, setLayoutModeState] = useState<LayoutMode>("advanced");

    useEffect(() => {
        const savedMode = localStorage.getItem("app_layout_mode") as LayoutMode;
        if (savedMode && (savedMode === "simple" || savedMode === "advanced")) {
            setLayoutModeState(savedMode);
        }
    }, []);

    const setLayoutMode = (mode: LayoutMode) => {
        setLayoutModeState(mode);
        localStorage.setItem("app_layout_mode", mode);
        // Force a reload to ensure clean state transition between layout engines
        window.location.reload();
    };

    return (
        <LayoutContext.Provider value={{ layoutMode, setLayoutMode }}>
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (context === undefined) {
        throw new Error("useLayout must be used within a LayoutProvider");
    }
    return context;
}
