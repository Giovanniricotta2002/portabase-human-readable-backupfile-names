import * as drizzleDb from "@/db";
import {db as dbClient} from "@/db";
import {and, eq} from "drizzle-orm";
import {logger} from "@/lib/logger";
import {sendNotificationsBackupRestore} from "@/features/notifications/utils/notifications.helpers";
import {withUpdatedAt} from "@/db/utils";
import {StorageInput} from "@/features/storages/types";
import {dispatchStorage} from "@/features/storages/utils/storages.dispatch";

const log = logger.child({module: "api/agent/status/restoration"});

export async function handleFailedRestoration(restorationId: string, databaseId: string, reason: string): Promise<void> {
    try {
        await dbClient
            .insert(drizzleDb.schemas.jobLog)
            .values({
                backupId: null,
                restorationId,
                loggedAt: new Date(),
                entryType: "log",
                level: "error",
                message: reason,
                command: null,
                output: null,
                exitCode: null,
                durationMs: null,
            });

        const databaseWithPolicies = await dbClient.query.database.findFirst({
            where: eq(drizzleDb.schemas.database.id, databaseId),
            with: {alertPolicies: true, project: {with: {alertPolicies: true}}},
        });

        if (databaseWithPolicies) {
            await sendNotificationsBackupRestore(databaseWithPolicies, "error_restore");
        }
    } catch (err) {
        log.error({error: err, name: "handleFailedRestoration"}, "Failed to record restoration failure job log / notification");
    }
}

/**
 * Picks up the database's waiting restoration and signs its backup URLs.
 * Returns null when there is nothing to restore on this tick; the caller still
 * reports the database to the agent.
 */
export async function prepareRestoration(databaseId: string): Promise<{file: string | null; metaFile: string | null; size: number | null} | null> {
    const restoration = await dbClient.query.restoration.findFirst({
        where: and(eq(drizzleDb.schemas.restoration.databaseId, databaseId), eq(drizzleDb.schemas.restoration.status, "waiting")),
        with: {
            backupStorage: true
        }
    })

    if (!restoration) return null;

    if (!restoration.backupStorage || restoration.backupStorage.status != "success" || !restoration.backupStorage.path) {
        return null;
    }

    const input: StorageInput = {
        action: "get",
        data: {
            path: restoration.backupStorage.path,
            signedUrl: true,
        },
        metadata: {
            storageId: restoration.backupStorage.storageChannelId,
            fileKind: "backups"
        }
    };

    const inputMeta: StorageInput = {
        action: "get",
        data: {
            path: `${restoration.backupStorage.path}.meta`,
            signedUrl: true,
        },
        metadata: {
            storageId: restoration.backupStorage.storageChannelId,
            fileKind: "backups"
        }
    };

    let file: string | null;
    let metaFile: string | null;

    try {
        const result = await dispatchStorage(input, undefined, restoration.backupStorage.storageChannelId);
        const resultMeta = await dispatchStorage(inputMeta, undefined, restoration.backupStorage.storageChannelId);

        if (result.file && typeof (result.file as any).destroy === "function") {
            (result.file as any).destroy();
        }
        if (resultMeta.file && typeof (resultMeta.file as any).destroy === "function") {
            (resultMeta.file as any).destroy();
        }

        if (!result.success) {
            await dbClient
                .update(drizzleDb.schemas.restoration)
                .set(withUpdatedAt({status: "failed"}))
                .where(eq(drizzleDb.schemas.restoration.id, restoration.id));

            const errorMessage = "Failed to get backup URL";
            log.error({error: errorMessage, name: "prepareRestoration"}, "Restoration failed");

            await handleFailedRestoration(restoration.id, databaseId, errorMessage);
            return null;
        }

        file = result.url ?? null;
        metaFile = resultMeta.url ?? null;
    } catch (err) {
        log.error({error: err, name: "prepareRestoration"}, "Restoration crashed unexpectedly");
        await dbClient
            .update(drizzleDb.schemas.restoration)
            .set(withUpdatedAt({status: "failed"}))
            .where(eq(drizzleDb.schemas.restoration.id, restoration.id));
        await handleFailedRestoration(restoration.id, databaseId, "Restoration crashed unexpectedly");
        return null;
    }

    await dbClient
        .update(drizzleDb.schemas.restoration)
        .set(withUpdatedAt({status: "ongoing"}))
        .where(eq(drizzleDb.schemas.restoration.id, restoration.id));

    return {file, metaFile, size: restoration.backupStorage.size};
}
