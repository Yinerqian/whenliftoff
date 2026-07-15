export type Launch = {
  external_id: string;
  slug: string;
  name: string;
  name_cn: string | null;
  mission_description: string | null;
  mission_description_cn: string | null;
  provider: string | null;
  provider_cn: string | null;
  rocket_name: string | null;
  status: string;
  status_cn: string;
  launch_time_utc: string | null;
  window_end_utc: string | null;
  location: string | null;
  location_cn: string | null;
  country_code: string | null;
  pad: string | null;
  image_url: string | null;
  webcast_url: string | null;
  source_url: string | null;
  api_updated_at: string | null;
  synced_at: string;
};

export type LaunchQuery = {
  q?: string;
  status?: string;
  provider?: string;
  country?: string;
  currentMonth?: boolean;
  futureAfterCurrentMonth?: boolean;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
};

export type LaunchResult = {
  items: Launch[];
  nextCursor: string | null;
  lastSyncedAt: string | null;
  providers: string[];
  monthTotal: number;
  providerCounts: Array<{ provider: string; count: number }>;
};

export type LaunchLibraryLaunch = {
  id: string;
  slug: string;
  name: string;
  status?: { abbrev?: string | null; name?: string | null } | null;
  net?: string | null;
  window_end?: string | null;
  launch_service_provider?: { name?: string | null } | null;
  rocket?: { configuration?: { full_name?: string | null } | null } | null;
  pad?: {
    name?: string | null;
    location?: { name?: string | null; country_code?: string | null } | null;
  } | null;
  mission?: { description?: string | null } | null;
  image?: string | { image_url?: string | null; thumbnail_url?: string | null } | null;
  image_url?: string | { image_url?: string | null; thumbnail_url?: string | null } | null;
  webcast_live?: boolean | null;
  vidURLs?: string[] | null;
  url?: string | null;
  last_updated?: string | null;
};
