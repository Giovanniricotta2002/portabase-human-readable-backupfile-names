import {spawn, type ChildProcess} from "node:child_process";
import {mkdirSync} from "node:fs";
import path from "node:path";
import {env} from "@/env.mjs";
import {logger} from "@/lib/logger";
import {getBackupFolderName} from "@/utils/file-prefix";
import {localStorageCredential, localStorageRoot} from "@/lib/local-storage/credential";

const log = logger.child({module: "lib/local-storage"});

const SERVERS: {name: string; args: (base: string) => string[]}[] = [
    {
        name: "restic",
        args: (base) => ["serve", "restic", "--append-only", "--addr", "127.0.0.1:1081", "--baseurl", "/storage/restic", path.join(base, "restic")],
    },
    {
        name: "sync",
        args: (base) => ["serve", "webdav", "--addr", "127.0.0.1:1082", "--baseurl", "/storage/sync", "--server-read-timeout", "24h", "--server-write-timeout", "24h", "--dir-cache-time", "5s", path.join(base, "sync")],
    },
];

const children = new Set<ChildProcess>();
let exiting = false;

export function startLocalStorageServers(masterKey: Buffer): void {
    const base = path.join(localStorageRoot(env.PRIVATE_PATH!), getBackupFolderName());
    const {user, pass} = localStorageCredential(masterKey);

    const childEnv: Record<string, string> = {RCLONE_USER: user, RCLONE_PASS: pass};
    if (process.env.PATH !== undefined) childEnv.PATH = process.env.PATH;
    if (process.env.HOME !== undefined) childEnv.HOME = process.env.HOME;
    process.once("exit", () => {
        exiting = true;
        for (const child of children) child.kill();
    });
    for (const server of SERVERS) {
        try {
            const args = server.args(base);
            mkdirSync(args[args.length - 1], {recursive: true});
            supervise(server.name, args, childEnv, 1000);
        } catch (error) {
            log.error({server: server.name, error: error instanceof Error ? error.message : String(error)}, "local storage server not started");
        }
    }
}


function supervise(name: string, args: string[], childEnv: Record<string, string>, delay: number): void {
    const startedAt = Date.now();
    let tail: string[] = [];
    let missing = false;

    const child = spawn("rclone", args, {env: childEnv as NodeJS.ProcessEnv, stdio: ["ignore", "ignore", "pipe"]});
    children.add(child);
    child.stderr?.on("data", (chunk: Buffer) => {
        tail = [...tail, ...chunk.toString().split("\n").filter(Boolean)].slice(-5);
    });
    child.on("error", (error: NodeJS.ErrnoException) => {
        missing = error.code === "ENOENT";
        log.error(
            {server: name, error: missing ? "rclone binary not found" : error.message},
            "local storage server could not start",
        );
    });
    child.on("close", (code, signal) => {
        children.delete(child);
        if (exiting || missing) return;
        const wait = Date.now() - startedAt > 60_000 ? 1000 : delay;
        log.error(
            {server: name, code, signal, stderr: tail.join(" | ")},
            `local storage server exited; restarting in ${wait / 1000}s`,
        );
        setTimeout(() => supervise(name, args, childEnv, Math.min(wait * 2, 30_000)), wait).unref();
    });
    log.info({server: name, root: args[args.length - 1]}, "local storage server started");
}
