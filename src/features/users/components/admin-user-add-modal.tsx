"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Organization } from "@/db/schema/03_organization";
import {AdminUserForm} from "@/features/users/components/admin-user-form";
import {UserCredentials, UserCredentialsView} from "@/features/users/components/user-credentials-view";

type AdminUserAddModalProps = {
    organizations: Organization[];
    canSendEmail: boolean;
    isPasswordAuthEnabled: boolean;
};

export const AdminUserAddModal = ({ organizations, canSendEmail, isPasswordAuthEnabled }: AdminUserAddModalProps) => {

    const [open, setOpen] = useState(false);
    const [credentials, setCredentials] = useState<UserCredentials>();
    const [isDirty, setIsDirty] = useState(false);

    const onOpenChange = (value: boolean) => {
        if (value) setCredentials(undefined);
        setOpen(value);
    };

    const keepOpenWhileCredentialsShown = (event: Event) => {
        if (credentials) event.preventDefault();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <Plus /> Create a user
                </Button>
            </DialogTrigger>
            <DialogContent
                preventOutsideClose={isDirty}
                onInteractOutside={keepOpenWhileCredentialsShown}
                onEscapeKeyDown={keepOpenWhileCredentialsShown}
            >
                <DialogHeader>
                    <DialogTitle>{credentials ? "User created" : "Create a new user"}</DialogTitle>
                    <DialogDescription>
                        {credentials
                            ? "Share these credentials with the user so they can sign in"
                            : "To create a new user please provide following informations"}
                    </DialogDescription>
                    {credentials ? (
                        <UserCredentialsView credentials={credentials} onDone={() => setOpen(false)} />
                    ) : (
                        <AdminUserForm
                            organizations={organizations}
                            canSendEmail={canSendEmail}
                            isPasswordAuthEnabled={isPasswordAuthEnabled}
                            onDirtyChange={setIsDirty}
                            onSuccess={(created) => (created ? setCredentials(created) : setOpen(false))}
                        />
                    )}
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
};
