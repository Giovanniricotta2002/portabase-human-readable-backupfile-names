import {useEffect, useState} from "react";

export function blockOutsideDismissal(
    event: {preventDefault: () => void},
    preventOutsideClose: boolean | undefined,
    onBlocked: () => void,
) {
    if (!preventOutsideClose) return;
    event.preventDefault();
    onBlocked();
}

export function useOutsideCloseFeedback(preventOutsideClose?: boolean) {
    const [showWarning, setShowWarning] = useState(false);
    const [isNudging, setIsNudging] = useState(false);

    useEffect(() => {
        if (!preventOutsideClose) {
            setShowWarning(false);
            setIsNudging(false);
        }
    }, [preventOutsideClose]);

    return {
        showWarning,
        isNudging,
        onBlocked: () => { setShowWarning(true); setIsNudging(true); },
        onNudgePeak: () => setIsNudging(false),
    };
}
