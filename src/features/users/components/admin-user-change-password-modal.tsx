"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { User } from "@/db/schema/02_user";
import { ButtonWithLoading } from "@/components/common/button-with-loading";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { admin, requestPasswordReset } from "@/lib/auth/auth-client";
import { generateValidPassword } from "@/utils/password";
import { UserCredentials, UserCredentialsView } from "@/features/users/components/user-credentials-view";
import { toast } from "sonner";

type AdminUserChangePasswordProps = {
    open: boolean;
    user: User;
    canSendEmail: boolean;
    onOpenChange: (open: boolean) => void;
};

export const AdminUserChangePassword = ({ user, open, canSendEmail, onOpenChange }: AdminUserChangePasswordProps) => {

    const [sendByEmail, setSendByEmail] = useState(canSendEmail);
    const [credentials, setCredentials] = useState<UserCredentials>();

    useEffect(() => {
        if (open) setCredentials(undefined);
    }, [open]);

    const mutation = useMutation({
        mutationFn: async () => {
            if (sendByEmail) {
                await requestPasswordReset(
                    {
                        email: user.email,

                    },
                    {
                        onSuccess: () => {
                            toast.success("Reset password request successfully sent!");
                            onOpenChange(false);
                        },
                        onError: (error) => {
                            toast.error(error.error.message);
                        },
                    }
                );
                return;
            }

            const newPassword = generateValidPassword();
            await admin.setUserPassword(
                {
                    userId: user.id,
                    newPassword,
                },
                {
                    onSuccess: () => {
                        toast.success("Password successfully changed");
                        setCredentials({ email: user.email, password: newPassword });
                    },
                    onError: (error) => {
                        toast.error(error.error.message);
                    },
                }
            );
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent onEscapeKeyDown={(event) => credentials && event.preventDefault()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Change {user.name}'s password</AlertDialogTitle>
                    <AlertDialogDescription>
                        {credentials
                            ? "Share the new password with the user so they can sign in."
                            : sendByEmail
                                ? "This action will send an email to the user to reset their password."
                                : "This action will replace the user's password with a newly generated one."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {credentials ? (
                    <UserCredentialsView credentials={credentials} onDone={() => onOpenChange(false)} />
                ) : (
                    <>
                        {canSendEmail && (
                            <div className="flex items-center justify-between">
                                <Label htmlFor={`send-reset-by-email-${user.id}`}>Send reset link by email</Label>
                                <Switch
                                    id={`send-reset-by-email-${user.id}`}
                                    checked={sendByEmail}
                                    onCheckedChange={setSendByEmail}
                                />
                            </div>
                        )}
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <ButtonWithLoading onClick={async () => await mutation.mutateAsync()} isPending={mutation.isPending}>
                                Validate
                            </ButtonWithLoading>
                        </AlertDialogFooter>
                    </>
                )}
            </AlertDialogContent>
        </AlertDialog>
    );
};
