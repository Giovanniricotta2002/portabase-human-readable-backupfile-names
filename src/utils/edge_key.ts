import "server-only";
import {getMasterServerKeyContent} from "@/features/agents/utils/keys.server";

export async function generateEdgeKey(serverUrl: string, agentId: string): Promise<string> {
    const masterKey = await getMasterServerKeyContent()
    const edgeKeyData = {
        serverUrl,
        agentId,
        masterKeyB64: masterKey.toString('base64')
    };
    const edgeKeyJson = JSON.stringify(edgeKeyData);
    return Buffer.from(edgeKeyJson, 'utf-8').toString('base64');
}
