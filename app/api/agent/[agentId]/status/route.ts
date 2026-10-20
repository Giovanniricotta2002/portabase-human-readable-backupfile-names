import { NextResponse } from "next/server";
import { handleDatabases } from "@/features/agents/utils/status/status.helpers";
import { Body } from "@/features/agents/types";
import * as drizzleDb from "@/db";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { withUpdatedAt } from "@/db/utils";
import { logger } from "@/lib/logger";
import { Agent } from "@/db/schema/08_agent";
import { withAgentCheck } from "../backup/helpers";

const log = logger.child({ module: "api/agent/status/route" });

async function postStatus(request: Request, { agent }: { agent: Agent }) {
  try {
    const agentId = agent.id;
    log.debug(`Agent ID: ${agentId}`);
    const body: Body = await request.json();
    const lastContact = new Date();

    const [settings] = await db
      .select()
      .from(drizzleDb.schemas.setting)
      .where(eq(drizzleDb.schemas.setting.name, "system"))
      .limit(1);
    if (!settings) {
      return NextResponse.json({ error: "An error occurred" }, { status: 404 });
    }

    const databasesResponse = await handleDatabases(
      body,
      agent,
      lastContact,
      settings,
    );

    await db
      .update(drizzleDb.schemas.agent)
      .set(
        withUpdatedAt({
          version: body.version,
          lastContact: lastContact,
          healthErrorCount: null,
        }),
      )
      .where(eq(drizzleDb.schemas.agent.id, agentId));

    await db.insert(drizzleDb.schemas.healthcheckLog).values({
      kind: "agent",
      status: "success",
      objectId: agentId,
      date: lastContact,
    });

    const response = {
      agent: {
        id: agentId,
        lastContact: lastContact,
      },
      databases: databasesResponse,
    };

    return Response.json(response);
  } catch (error) {
    log.error({ error: error }, "Error in POST handler");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withAgentCheck(postStatus);
