"use client";

import {useRouter} from "next/navigation";
import {useMutation} from "@tanstack/react-query";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useZodForm} from "@/components/ui/form";
import {Organization} from "@/db/schema/03_organization";
import {Input} from "@/components/ui/input";
import {ButtonWithLoading} from "@/components/common/button-with-loading";
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {UserSchema, UserType} from "@/features/users/schemas/user.schema";
import {toast} from "sonner";
import {createUserAction} from "@/features/users/actions/user.action";
import {UserCredentials} from "@/features/users/components/user-credentials-view";
import {useReportFormDirty} from "@/hooks/use-report-form-dirty";

type AdminUserFormProps = {
    onSuccess?: (credentials?: UserCredentials) => void;
    onDirtyChange?: (dirty: boolean) => void;
    organizations: Organization[];
    canSendEmail: boolean;
    isPasswordAuthEnabled: boolean;
};

export const AdminUserForm = ({onSuccess, onDirtyChange, organizations, canSendEmail, isPasswordAuthEnabled}: AdminUserFormProps) => {

    const router = useRouter();
    const form = useZodForm({
        schema: UserSchema,
        defaultValues: {
            role: "user",
            name: "",
            email: "",
            sendCredentialsByEmail: canSendEmail,
        },
    });
    useReportFormDirty(form, onDirtyChange);

    const onCancel = () => {
        form.reset();
        onSuccess?.();
    };

    const mutation = useMutation({
        mutationFn: async (data: UserType) => {
            const result = await createUserAction(data);
            const inner = result?.data;
            if (inner?.success) {
                const password = inner.value?.password;
                if (password && data.sendCredentialsByEmail) {
                    toast.warning("User created, but the email could not be sent");
                } else {
                    toast.success("User Successfully created");
                }
                onSuccess?.(password ? {email: data.email, password} : undefined);
                router.refresh();
            } else {
                toast.error("An error occurred");
                onSuccess?.();
            }
        },
    });

    return (
        <Form
            form={form}
            className="flex flex-col gap-4"
            onSubmit={async (values) => {
                await mutation.mutateAsync(values);
            }}
        >
            <FormField
                control={form.control}
                name="name"
                render={({field}) => (
                    <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter a name" {...field} value={field.value ?? ""}/>
                        </FormControl>
                        <FormMessage/>
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="email"
                render={({field}) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input placeholder="Fill user email" {...field} value={field.value ?? ""}/>
                        </FormControl>
                        <FormMessage/>
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="role"
                render={({field}) => (
                    <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role"/>
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage/>
                    </FormItem>
                )}
            />

            {isPasswordAuthEnabled && (canSendEmail ? (
                <FormField
                    control={form.control}
                    name="sendCredentialsByEmail"
                    render={({field}) => (
                        <FormItem className="flex items-center justify-between">
                            <FormLabel>Send credentials by email</FormLabel>
                            <FormControl>
                                <Switch checked={!!field.value} onCheckedChange={field.onChange}/>
                            </FormControl>
                        </FormItem>
                    )}
                />
            ) : (
                <p className="text-sm text-muted-foreground">
                    Email is not configured: the generated password will be shown once after creation.
                </p>
            ))}

            <div className="flex gap-4 justify-end">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <ButtonWithLoading type="submit" isPending={mutation.isPending}>
                    Validate
                </ButtonWithLoading>
            </div>
        </Form>
    );
};
