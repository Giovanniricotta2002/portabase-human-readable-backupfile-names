"use client";

import {useEffect, useRef} from "react";
import {Page, PageContent, PageHeader, PageTitle} from "@/features/layout/components/page";
import {EmptyStatePlaceholder} from "@/components/common/empty-state-placeholder";
import {authClient} from "@/lib/auth/auth-client";

// Pages in this group call notFound() when there is no active organization
// (e.g. the user was removed from it), so tell that case apart from a real 404.
// Client-side on purpose: the active organization store is already loaded by the
// sidebar combobox, and a server component here would run on every page render.
export default function NotFound() {
    const {data: organization, isPending} = authClient.useActiveOrganization();
    const shownForOrganizationId = useRef<string | null | undefined>(undefined);

    // Next keeps this boundary up until the pathname changes, so router.refresh()
    // after picking an organization in the combobox is not enough: reload instead.
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
