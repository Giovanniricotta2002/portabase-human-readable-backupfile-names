"use server";
import { z } from "zod";
import { EmailFormSchema } from "@/features/settings/schemas/email-form.schema";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as drizzleDb from "@/db";
import {ActionError, userAction} from "@/lib/safe-actions/actions";
import {withUpdatedAt} from "@/db/utils";
import {computeSystemPermissions} from "@/lib/acl/system-acl";
import {getSettings} from "@/db/services/setting";
import {sendEmail} from "@/lib/email";
import {render} from "@react-email/components";
import EmailSettingsTest from "@/components/emails/email-settings-test";

export const updateEmailSettingsAction = userAction
    .inputSchema(
        z.object({
            name: z.string(),
            data: EmailFormSchema,
        })
    )
    .action(async ({ parsedInput }) => {
        const { name, data } = parsedInput;

        const [updatedSettings] = await db
            .update(drizzleDb.schemas.setting)
            .set(withUpdatedAt({
                ...data,
            }))
            .where(eq(drizzleDb.schemas.setting.name, name))
            .returning();

        return {
            data: updatedSettings,
        };
    });

export const sendTestEmailAction = userAction.action(async ({ ctx }) => {
    const { isAdmin, isSuperAdmin } = computeSystemPermissions(ctx.user);
    if (!isAdmin && !isSuperAdmin) {
        throw new ActionError("You are not allowed to perform this action");
    }

    const settings = await getSettings();
    if (!settings?.smtpUser || !settings?.smtpFrom) {
        throw new ActionError("SMTP is not configured");
    }

    try {
        const email = await sendEmail({
            to: settings.smtpUser,
            subject: "Portabase",
            html: await render(EmailSettingsTest(), {}),
        });
        return { sent: !!email?.response };
    } catch (error: unknown) {
        throw new ActionError(`Email sending failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
});
