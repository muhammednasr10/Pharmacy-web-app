import type { CrmCustomerProfile } from "../types";

export function filterCrmProfiles(
  profiles: CrmCustomerProfile[],
  search: string,
  segmentFilter: string,
): CrmCustomerProfile[] {
  const searchValue = search.trim().toLowerCase();
  return profiles.filter((profile) => {
    const matchesSearch =
      !searchValue ||
      profile.name.toLowerCase().includes(searchValue) ||
      (profile.phone || "").includes(searchValue);
    const matchesSegment = segmentFilter === "all" || profile.segment === segmentFilter;
    return matchesSearch && matchesSegment;
  });
}
