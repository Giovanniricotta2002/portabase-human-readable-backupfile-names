import {useEffect} from "react";
import {useFormState, useWatch, type FieldValues, type UseFormReturn} from "react-hook-form";
import {canonicalize} from "@/lib/utils";

export function useReportFormDirty<T extends FieldValues>(form: UseFormReturn<T>, onDirtyChange?: (dirty: boolean) => void, ignoredField?: keyof T) {
    const values = useWatch({control: form.control});
    const {defaultValues} = useFormState({control: form.control});
    const signature = (source: object | undefined) => JSON.stringify(canonicalize(ignoredField ? {...source, [ignoredField]: undefined} : source));
    const reportedDirty = signature(values) !== signature(defaultValues);
    useEffect(() => {
        onDirtyChange?.(reportedDirty);
    }, [reportedDirty, onDirtyChange]);

    useEffect(() => () => {
        onDirtyChange?.(false);
    }, [onDirtyChange]);
}
