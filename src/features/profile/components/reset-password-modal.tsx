"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ResetPasswordForm from "./profile-reset-password-form";
import {useState} from "react";

type ResetPasswordModalProps = {
    onOpenChange: (open: boolean) => void;
    open: boolean;
    disabled?: boolean;
};

export function ResetPasswordProfileProviderModal({ onOpenChange, open, disabled }: ResetPasswordModalProps) {
    const [isDirty, setIsDirty] = useState(false);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild disabled={disabled}>
                <Button variant="outline" size="sm" disabled={disabled}>
                    Reset Password
                </Button>
            </DialogTrigger>
            <DialogContent preventOutsideClose={isDirty}>
                <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>Enter a new password for your account below.</DialogDescription>
                </DialogHeader>
                <ResetPasswordForm onSuccess={() => onOpenChange(false)} onDirtyChange={setIsDirty} />
            </DialogContent>
        </Dialog>
    );
}

