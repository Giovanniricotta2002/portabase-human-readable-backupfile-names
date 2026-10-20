"use server";

import { z } from "zod";
import { action, ActionError } from "@/lib/safe-actions/actions";
import { signPasskeyContext } from "@/lib/auth/passkey-context";
import { hasUsers } from "@/db/services/user";

// Sessionless passkey registration only bootstraps the first account.
export const generatePasskeyContextAction = action
  .inputSchema(z.object({ name: z.string().min(1), email: z.email() }))
  .action(async ({ parsedInput }) => {
    if (await hasUsers()) {
      throw new ActionError(
        "Passkey registration requires an authenticated session",
      );
    }
    return signPasskeyContext(parsedInput.name, parsedInput.email);
  });
