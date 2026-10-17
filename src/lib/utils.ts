import {clsx, type ClassValue} from "clsx";
import {twMerge} from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    Object.prototype.toString.call(v) === "[object Object]";

export function canonicalize(value: unknown): unknown {
    if (Array.isArray(value)) {
        const items = value.map(canonicalize);
        return items.every((item) => typeof item === "string") ? items.sort() : items;
    }
    if (!isPlainObject(value)) return value;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
        const inner = canonicalize(value[key]);
        if (inner === undefined || inner === null || inner === "") continue;
        if (isPlainObject(inner) && Object.keys(inner).length === 0) continue;
        if (Array.isArray(inner) && inner.length === 0) continue;
        out[key] = inner;
    }
    return out;
}
