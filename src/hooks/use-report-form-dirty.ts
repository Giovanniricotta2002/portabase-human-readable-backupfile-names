import {useEffect} from "react";
import {useFormState, type FieldValues, type UseFormReturn} from "react-hook-form";

export function useReportFormDirty<T extends FieldValues>(form: UseFormReturn<T>, onDirtyChange?: (dirty: boolean) => void, ignoredField?: keyof T) {
    const {isDirty, dirtyFields} = useFormState({control: form.control});
    const reportedDirty = ignoredField ? Object.keys(dirtyFields).some(field => field !== ignoredField) : isDirty;
    useEffect(() => {
        onDirtyChange?.(reportedDirty);
    }, [reportedDirty, onDirtyChange]);

    useEffect(() => () => {
        onDirtyChange?.(false);
    }, [onDirtyChange]);
}
