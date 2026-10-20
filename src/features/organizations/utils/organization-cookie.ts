import {cookies} from 'next/headers';

const COOKIE_NAME = 'PORTABASE_ORGANIZATION_SLUG';

export async function getCurrentOrganizationSlug() {
    return (await cookies()).get(COOKIE_NAME)?.value || "";
}
