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
  details?: LaunchDetails;
};

export type LaunchTimelineEvent = {
  id: number | null;
  code: string;
  title: string;
  description: string | null;
  relative_time: string;
  offset_seconds: number;
  is_key_event: boolean;
  phase: "prelaunch" | "liftoff" | "flight";
};

export type LaunchResourceLink = {
  url: string;
  title: string | null;
  source: string | null;
  publisher: string | null;
  type: string | null;
  language: string | null;
  feature_image: string | null;
  start_time: string | null;
  live: boolean | null;
  official: boolean;
};

export type LaunchDetails = {
  window_start_utc: string | null;
  net_precision: string | null;
  mission_type: string | null;
  orbit_name: string | null;
  orbit_abbrev: string | null;
  provider_type: string | null;
  rocket_manufacturer: string | null;
  rocket_variant: string | null;
  rocket_reusable: boolean | null;
  rocket_min_stage: number | null;
  rocket_max_stage: number | null;
  rocket_length_m: number | null;
  rocket_diameter_m: number | null;
  rocket_launch_mass_t: number | null;
  rocket_leo_capacity_kg: number | null;
  rocket_gto_capacity_kg: number | null;
  booster_serial: string | null;
  booster_flight_number: number | null;
  booster_reused: boolean | null;
  landing_attempt: boolean | null;
  landing_success: boolean | null;
  landing_description: string | null;
  landing_location: string | null;
  landing_type: string | null;
  probability: number | null;
  weather_concerns: string | null;
  latitude: number | null;
  longitude: number | null;
  map_url: string | null;
  map_image_url: string | null;
  timeline: LaunchTimelineEvent[];
  video_links: LaunchResourceLink[];
  info_links: LaunchResourceLink[];
  infographic_url: string | null;
  mission_patch_url: string | null;
  flightclub_url: string | null;
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

export type HomeMonthlyLaunchStat = {
  month: string;
  total: number;
  successful: number;
};

export type HomeProviderLaunchStat = {
  name: string;
  abbrev: string | null;
  image_url: string | null;
  count: number;
  share: number;
};

export type HomeCountryLaunchStat = {
  code: string;
  alpha_2_code: string | null;
  name: string;
  flag_url: string | null;
  count: number;
  share: number;
  is_other?: boolean;
};

export type HomeRocketLaunchStat = {
  name: string;
  image_url: string | null;
  count: number;
  share: number;
  is_other?: boolean;
};

export type HomeLaunchStats = {
  id: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  total_launches: number;
  successful_launches: number;
  failed_launches: number;
  success_rate: number;
  active_providers: number;
  active_countries: number;
  active_pads: number;
  monthly: HomeMonthlyLaunchStat[];
  providers: HomeProviderLaunchStat[];
  countries: HomeCountryLaunchStat[];
  rockets: HomeRocketLaunchStat[];
};

export type LaunchLibraryCountry = {
  name?: string | null;
  alpha_2_code?: string | null;
  alpha_3_code?: string | null;
};

export type LaunchLibraryLaunch = {
  id: string;
  slug: string;
  name: string;
  status?: { abbrev?: string | null; name?: string | null } | null;
  net?: string | null;
  net_precision?: { name?: string | null; abbrev?: string | null } | null;
  window_start?: string | null;
  window_end?: string | null;
  probability?: number | null;
  weather_concerns?: string | null;
  launch_service_provider?: {
    name?: string | null;
    abbrev?: string | null;
    type?: { name?: string | null } | null;
    logo?: LaunchLibraryImage | null;
    social_logo?: LaunchLibraryImage | null;
  } | null;
  rocket?: {
    configuration?: {
      full_name?: string | null;
      variant?: string | null;
      image?: LaunchLibraryImage | null;
      manufacturer?: { name?: string | null } | null;
      reusable?: boolean | null;
      min_stage?: number | null;
      max_stage?: number | null;
      length?: number | null;
      diameter?: number | null;
      launch_mass?: number | null;
      leo_capacity?: number | null;
      gto_capacity?: number | null;
    } | null;
    launcher_stage?: Array<{
      reused?: boolean | null;
      launcher_flight_number?: number | null;
      launcher?: { serial_number?: string | null } | null;
      landing?: {
        attempt?: boolean | null;
        success?: boolean | null;
        description?: string | null;
        landing_location?: { name?: string | null; abbrev?: string | null } | null;
        type?: { name?: string | null; abbrev?: string | null } | null;
      } | null;
    }> | null;
  } | null;
  pad?: {
    id?: number | null;
    name?: string | null;
    country?: LaunchLibraryCountry | null;
    location?: { name?: string | null; country?: LaunchLibraryCountry | null; country_code?: string | null } | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
    map_url?: string | null;
    map_image?: LaunchLibraryImage | null;
  } | null;
  mission?: {
    description?: string | null;
    type?: string | null;
    orbit?: { name?: string | null; abbrev?: string | null } | null;
  } | null;
  image?: string | LaunchLibraryImage | null;
  image_url?: string | LaunchLibraryImage | null;
  webcast_live?: boolean | null;
  vidURLs?: string[] | null;
  vid_urls?: LaunchLibraryUrl[] | null;
  info_urls?: LaunchLibraryUrl[] | null;
  timeline?: LaunchLibraryTimelineEntry[] | null;
  infographic?: LaunchLibraryImage | null;
  mission_patches?: Array<{ image?: LaunchLibraryImage | null }> | null;
  flightclub_url?: string | null;
  url?: string | null;
  last_updated?: string | null;
};

export type LaunchLibraryImage = {
  image_url?: string | null;
  thumbnail_url?: string | null;
};

export type LaunchLibraryUrl = {
  priority?: number | null;
  source?: string | null;
  publisher?: string | null;
  title?: string | null;
  url?: string | null;
  type?: { name?: string | null } | null;
  language?: { name?: string | null; code?: string | null } | null;
  feature_image?: string | null;
  start_time?: string | null;
  live?: boolean | null;
};

export type LaunchLibraryTimelineEntry = {
  type?: { id?: number | null; abbrev?: string | null; description?: string | null } | null;
  relative_time?: string | null;
  duration?: string | null;
  description?: string | null;
};
