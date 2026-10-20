"use server"
import {z} from "zod";
import {ActionError, superAdminAction, userAction} from "@/lib/safe-actions/actions";
import {getMasterServerKeyContent} from "@/features/agents/utils/keys.server";
import {computeSystemPermissions} from "@/lib/acl/system-acl";
import {getAgent, resolveAgentAccess} from "@/lib/api-v1/services/agents";
import {generateEdgeKey} from "@/utils/edge_key";
import {getServerUrl} from "@/utils/get-server-url";

export const downloadMasterKeyAction = superAdminAction.action(async () => {
    try {
        const fileBuffer = await getMasterServerKeyContent();
        return {
            success: true,
            data: fileBuffer.toString("base64"),
        };
    } catch (error) {
        return {
            success: false,
            message: "Unable to download master key",
        };
    }
});

export const getAgentEdgeKeyAction = userAction.inputSchema(z.string()).action(async ({parsedInput, ctx}) => {
    const access = await resolveAgentAccess(parsedInput, {
        id: ctx.user.id,
        permissions: computeSystemPermissions(ctx.user),
    });
    const agent = access === "ok" ? await getAgent(parsedInput) : null;
    if (!agent) {
        throw new ActionError("Agent not found");
    }
    return generateEdgeKey(agent.overrideUrl ?? getServerUrl(), agent.id);
});
