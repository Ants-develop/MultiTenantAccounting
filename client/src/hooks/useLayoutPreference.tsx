import { useState, useEffect } from 'react';

const LAYOUT_PREFERENCE_KEY = 'layout-preference';

export type LayoutMode = 'flexlayout' | 'simple';

interface LayoutPreference {
    mode: LayoutMode;
    useFlexLayout: boolean;
}

/**
 * Hook to manage user's layout preference (FlexLayout vs Simple Layout)
 * Stored in localStorage per-user
 */
export function useLayoutPreference() {
    const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
        try {
            const stored = localStorage.getItem(LAYOUT_PREFERENCE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as LayoutPreference;
                return parsed.mode;
            }
        } catch (error) {
            console.error('Error reading layout preference:', error);
        }
        // Default to simple layout (multi-window disabled)
        return 'simple';
    });

    const useFlexLayout = layoutMode === 'flexlayout';

    const setLayoutPreference = (mode: LayoutMode) => {
        try {
            const preference: LayoutPreference = {
                mode,
                useFlexLayout: mode === 'flexlayout',
            };
            localStorage.setItem(LAYOUT_PREFERENCE_KEY, JSON.stringify(preference));
            setLayoutMode(mode);
        } catch (error) {
            console.error('Error saving layout preference:', error);
        }
    };

    const toggleLayout = () => {
        const newMode: LayoutMode = layoutMode === 'flexlayout' ? 'simple' : 'flexlayout';
        setLayoutPreference(newMode);
    };

    return {
        layoutMode,
        useFlexLayout,
        setLayoutPreference,
        toggleLayout,
    };
}
