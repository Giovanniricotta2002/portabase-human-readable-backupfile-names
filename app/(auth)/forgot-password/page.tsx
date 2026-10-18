import { CardContent, CardHeader } from "@/components/ui/card";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { env } from "@/env.mjs";
import { CardAuth } from "@/features/layout/components/card-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSettings } from "@/db/services/setting";
import { isSmtpConfigured } from "@/lib/email/helpers";

export default async function RoutePage(props: { searchParams: Promise<{ callbackUrl: string | undefined }> }) {
    if (env.AUTH_EMAIL_PASSWORD_ENABLED !== "true") {
        redirect("/login");
    }

    const canSendEmail = isSmtpConfigured(await getSettings());

    return (
        <TooltipProvider>
            <CardAuth className="w-full">
                <CardHeader>
                    <div className="grid gap-2 text-center mb-2">
                        <h1 className="text-3xl font-bold">Reset password</h1>
                        <p className="text-balance text-muted-foreground">
                            {canSendEmail
                                ? "Enter your email address and we'll send you a link to reset your password."
                                : "Password reset by email is unavailable. Contact your administrator to reset your password."}
                        </p>
                    </div>
                </CardHeader>
                <CardContent>
                    {canSendEmail ? (
                        <ForgotPasswordForm />
                    ) : (
                        <div className="flex justify-center">
                            <Link href="/login" className="group flex items-center text-sm hover:underline">
                                <ArrowLeft className="mr-1 size-4 text-muted-foreground transition-transform group-hover:-translate-x-1" />
                                Back to login
                            </Link>
                        </div>
                    )}
                </CardContent>
            </CardAuth>
        </TooltipProvider>
    );
}
