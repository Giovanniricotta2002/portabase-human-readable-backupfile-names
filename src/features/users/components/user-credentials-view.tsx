"use client";

import {useState} from "react";
import {AlertTriangle, Check, Copy, Eye, EyeOff} from "lucide-react";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {copyToClipboardWithMeta} from "@/components/common/copy-button";

export type UserCredentials = {
    email: string;
    password: string;
};

type UserCredentialsViewProps = {
    credentials: UserCredentials;
    onDone: () => void;
};

export const UserCredentialsView = ({credentials, onDone}: UserCredentialsViewProps) => {
    return (
        <div className="flex flex-col gap-4">
            <Alert>
                <AlertTriangle className="h-4 w-4"/>
                <AlertDescription>
                    This password is shown only once. Copy it and share it securely with the user.
                </AlertDescription>
            </Alert>
            <CredentialField label="Email" value={credentials.email}/>
            <CredentialField label="Password" value={credentials.password} secret/>
            <div className="flex justify-end">
                <Button type="button" onClick={onDone}>
                    Done
                </Button>
            </div>
        </div>
    );
};

const CredentialField = ({label, value, secret}: { label: string; value: string; secret?: boolean }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isVisible, setIsVisible] = useState(!secret);

    const handleCopy = async () => {
        await copyToClipboardWithMeta(value);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="flex flex-col gap-2">
            <Label>{label}</Label>
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Input
                        readOnly
                        value={isVisible ? value : "•".repeat(value.length)}
                        onClick={(e) => e.currentTarget.select()}
                        className="font-mono text-xs bg-muted/30 h-10 pr-10"
                    />
                    {secret && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsVisible(!isVisible)}
                            className="absolute right-1 top-1.5 h-7 w-7 hover:bg-transparent"
                            type="button"
                        >
                            {isVisible ? <EyeOff className="h-3.5 w-3.5"/> : <Eye className="h-3.5 w-3.5"/>}
                            <span className="sr-only">{isVisible ? "Hide" : "Show"} {label.toLowerCase()}</span>
                        </Button>
                    )}
                </div>
                <Button variant="outline" onClick={handleCopy} className="shrink-0 h-10 px-4" type="button">
                    {isCopied ? <Check className="h-4 w-4 text-green-500"/> : <Copy className="h-4 w-4"/>}
                    <span className="sr-only">Copy {label.toLowerCase()}</span>
                </Button>
            </div>
        </div>
    );
};
