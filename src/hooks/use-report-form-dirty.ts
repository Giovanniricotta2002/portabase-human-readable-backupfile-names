import {useEffect} from "react";
import {useFormState, type FieldValues, type UseFormReturn} from "react-hook-form";

export function useReportFormDirty<T extends FieldValues>(form: UseFormReturn<T>, onDirtyChange?: (dirty: boolean) => void) {
    const {isDirty} = useFormState({control: form.control});
    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    useEffect(() => () => {
        onDirtyChange?.(false);
    }, [onDirtyChange]);
}
