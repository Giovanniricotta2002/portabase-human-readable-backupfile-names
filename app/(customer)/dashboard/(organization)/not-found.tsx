"use client";

import {useEffect, useRef} from "react";
import {Page, PageContent, PageHeader, PageTitle} from "@/features/layout/components/page";
import {EmptyStatePlaceholder} from "@/components/common/empty-state-placeholder";
import {authClient} from "@/lib/auth/auth-client";

export default function NotFound() {
    const {data: organization, isPending} = authClient.useActiveOrganization();
    const shownForOrganizationId = useRef<string | null | undefined>(undefined);

    useEffect(() => {
        if (isPending) return;
        const organizationId = organization?.id ?? null;
        if (shownForOrganizationId.current === undefined) shownForOrganizationId.current = organizationId;
        else if (shownForOrganizationId.current !== organizationId) window.location.reload();
    }, [isPending, organization?.id]);

    if (isPending) return null;

    return (
        <Page>
            <PageHeader>
                <PageTitle>{organization ? "Not found" : "No active organization"}</PageTitle>
            </PageHeader>
            <PageContent>
                <EmptyStatePlaceholder
                    state="empty"
                    text={organization
                        ? "The content you are trying to view is not available."
                        : "Choose an organization from the organization menu, or contact your administrator if you don't belong to any."}
                />
            </PageContent>
        </Page>
    );
}
