"use server";

import {z} from "zod";
import {ActionError, userAction} from "@/lib/safe-actions/actions";
import {computeSystemPermissions} from "@/lib/acl/system-acl";
import {computeOrganizationPermissions} from "@/lib/acl/organization-acl";
import {getActiveMember} from "@/lib/auth/auth";
import {dispatchNotification} from "@/features/notifications/utils/notifications.dispatch";
import {dispatchStorage} from "@/features/storages/utils/storages.dispatch";
import type {
    NotificationChannelFormType,
    StorageChannelFormType
} from "@/features/channel/schemas/channel-form.schema";

export const testChannelAction = userAction
    .inputSchema(
        z.object({
            kind: z.enum(["notification", "storage"]),
            organizationId: z.string().optional(),
            channel: z.object({
                name: z.string().optional(),
                provider: z.string(),
                enabled: z.boolean().optional(),
                config: z.unknown(),
            }),
        })
    )
    .action(async ({parsedInput: {kind, organizationId, channel}, ctx}) => {
        const {isAdmin, isSuperAdmin} = computeSystemPermissions(ctx.user);
        if (!isAdmin && !isSuperAdmin) {
            const member = organizationId ? await getActiveMember() : null;
            const permissions = computeOrganizationPermissions(member ?? null);
            const canManage = kind === "notification" ? permissions.canManageNotifications : permissions.canManageStorages;
            if (!member || member.organizationId !== organizationId || !canManage) {
                throw new ActionError("You are not allowed to perform this action");
            }
        }

        // Only a fixed test message / ping: callers cannot pick a stored channel, policy or storage operation.
        const result: { success: boolean; message?: string; response?: unknown } = kind === "notification"
            ? await dispatchNotification(
                {title: "Test Channel", message: `We are testing channel ${channel.name}`, level: "info"},
                undefined,
                undefined,
                organizationId,
                channel as NotificationChannelFormType
            )
            : await dispatchStorage({action: "ping"}, undefined, undefined, channel as StorageChannelFormType);
        return {success: result.success, message: result.message, response: result.response};
    });
