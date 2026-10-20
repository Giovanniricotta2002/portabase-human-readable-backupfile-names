import {logger} from "@/lib/logger";
import {displayVersion, encryptStorages, isAgentVersionAtLeast, MIN_AGENT_VERSION_STORAGE_ENC} from "@/utils/status-crypto";

const log = logger.child({module: "api/agent/status/storage-encryption"});

export function applyStorageEncryption(
    entry: Record<string, any>,
    version: string | undefined,
    masterKey: Buffer | null,
    agentId: string,
): void {
    if (!Array.isArray(entry.storages) || entry.storages.length === 0) return;
    if (!masterKey) {
        log.error({name: "applyStorageEncryption", agentId}, "Master key unavailable; storages withheld");
        entry.storages = [];
        return;
    }
    if (!isAgentVersionAtLeast(version, MIN_AGENT_VERSION_STORAGE_ENC)) {
        console.log(
            `============================================================\n` +
            `⚠️OUTDATED AGENT — STORAGE CREDENTIALS WITHHELD\n` +
            `Agent ${agentId} reports v${displayVersion(version)} (< required v${MIN_AGENT_VERSION_STORAGE_ENC}).\n` +
            `Update this agent to v${MIN_AGENT_VERSION_STORAGE_ENC}+ to receive storage credentials.\n` +
            `============================================================`
        )
        entry.storages = [];
        return;
    }

    try {
        const ciphertext = encryptStorages(entry.storages, masterKey);
        entry.storages_ciphertext = ciphertext;
        entry.storages_encrypted = true;
        entry.storages = [];
    } catch (err) {
        log.error({error: err, name: "applyStorageEncryption"}, "Storage encryption failed; storages withheld");
        entry.storages = [];
    }
}
