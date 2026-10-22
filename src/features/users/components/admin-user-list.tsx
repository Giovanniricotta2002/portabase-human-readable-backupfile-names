"use client";
import { DataTable } from "@/components/common/data-table";
import {usersListColumns} from "@/features/users/components/user-columns";
import {User} from "@/db/schema/02_user";

type AdminUserListProps = {
    users: User[];
    isPasswordAuthEnabled: boolean;
    canSendEmail: boolean;
    avatarUrls?: Record<string, string | undefined>;
};

export const AdminUserList = ({ users, isPasswordAuthEnabled, canSendEmail, avatarUrls }: AdminUserListProps) => {
    return <DataTable columns={usersListColumns({ isPasswordAuthEnabled, canSendEmail, avatarUrls })} data={users} enablePagination={true} enableSelect={false} />;
};
