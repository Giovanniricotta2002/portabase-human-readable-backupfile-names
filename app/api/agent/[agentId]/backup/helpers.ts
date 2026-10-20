import {NextResponse} from "next/server";
import {and, eq, isNull} from "drizzle-orm";
import {db} from "@/db";
import * as drizzleDb from "@/db";
import {logger} from "@/lib/logger";
import {Agent} from "@/db/schema/08_agent";
import {isUUID} from "@/utils/text";
import {getMasterServerKeyContent} from "@/features/agents/utils/keys.server";
import {isAgentVersionAtLeast, MIN_AGENT_VERSION_SIGNED_REQUESTS, verifyAgentSignature} from "@/utils/status-crypto";

const log = logger.child({module: "api/agent/backup/helpers"});

export function withAgentCheck(handler: Function) {
    return async (request: Request, context: { params: Promise<{ agentId: string }> }) => {
        try {
            const agentId = (await context.params).agentId;

            const agent = isUUID(agentId)
                ? await db.query.agent.findFirst({
                    where: and(eq(drizzleDb.schemas.agent.id, agentId), eq(drizzleDb.schemas.agent.isArchived, false)),
                })
                : undefined;

            if (!agent) {
                return NextResponse.json(
                    {error: "Agent not found"},
                    {status: 404}
                );
            }

            const rejection = await authenticateAgentRequest(request, agentId, agent);
            if (rejection) return rejection;

            return handler(request, {...context, agent});
        } catch (err) {
            log.error({error: err, name: "withAgentCheck"}, "Error in agent middleware");
            return NextResponse.json(
                {error: "Internal server error"},
                {status: 500}
            );
        }
    };
}

/**
 * Returns a 401 response when the request is not proven to come from the agent, null otherwise.
 * Signed requests are verified. Unsigned requests are only accepted from legacy agents: never
 * for an agent whose stored version (written by a signed request) already signs, and never for
 * a request claiming such a version.
 */
async function authenticateAgentRequest(request: Request, agentId: string, agent: Agent): Promise<NextResponse | null> {
    const signature = request.headers.get("x-agent-signature");

    if (signature) {
        let masterKey: Buffer;
        try {
            masterKey = await getMasterServerKeyContent();
        } catch (err) {
            log.error({error: err, agentId}, "Master key unavailable; cannot verify agent signature");
            return NextResponse.json({error: "Invalid agent signature"}, {status: 401});
        }

        const body = new Uint8Array(await request.clone().arrayBuffer());
        const result = verifyAgentSignature(
            masterKey,
            agentId,
            request.method,
            new URL(request.url).pathname,
            request.headers.get("x-agent-timestamp"),
            signature,
            body,
        );
        if (result === "ok") return null;

        log.warn({agentId, result}, "Rejected agent request with an invalid signature");
        return NextResponse.json(
            {error: result === "skew" ? "Agent clock skew" : "Invalid agent signature"},
            {status: 401}
        );
    }

    if (isAgentVersionAtLeast(agent.version ?? undefined, MIN_AGENT_VERSION_SIGNED_REQUESTS)) {
        log.warn({agentId}, "Unsigned request for an agent that signs its requests");
        return NextResponse.json({error: "Agent signature required"}, {status: 401});
    }

    const claimed = (await request.clone().json().catch(() => null))?.version;
    const claimedVersion = typeof claimed === "string" ? claimed : undefined;
    if (isAgentVersionAtLeast(claimedVersion, MIN_AGENT_VERSION_SIGNED_REQUESTS)) {
        log.warn({agentId, claimedVersion}, "Unsigned request claiming a signing agent version");
        return NextResponse.json({error: "Agent signature required"}, {status: 401});
    }

    console.log(
        `============================================================\n` +
        `⚠️OUTDATED AGENT — REQUESTS NOT AUTHENTICATED\n` +
        `Agent ${agentId} reports v${claimedVersion ?? agent.version ?? "unknown"} (< required v${MIN_AGENT_VERSION_SIGNED_REQUESTS}).\n` +
        `Update this agent to v${MIN_AGENT_VERSION_SIGNED_REQUESTS}+ so the dashboard can authenticate it.\n` +
        `============================================================`
    );
    return null;
}

export async function getDatabaseOrThrow(generatedId: string, agentId: string) {
    const database = await db.query.database.findFirst({
        where: and(
            eq(drizzleDb.schemas.database.agentDatabaseId, generatedId),
            eq(drizzleDb.schemas.database.agentId, agentId),
            isNull(drizzleDb.schemas.database.deletedAt),
        ),
        with: {
            project: { with: { alertPolicies: true } },
            alertPolicies: true,
            storagePolicies: true
        }
    });

    if (!database) {
        throw NextResponse.json(
            {error: "Database associated with generatedId not found"},
            {status: 404}
        );
    }

    return database;
}