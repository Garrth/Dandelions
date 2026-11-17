// Public settings for the site. These two values are safe to publish:
// the publishable key only allows what the database rules (row level security) allow.
// Find them in Supabase: Project Settings > API.
window.DANDELIONS_CONFIG = {
  supabaseUrl: "https://utduohtyjbbcnzxfmutp.supabase.co",
  supabaseKey: "sb_publishable_C59TN4mfcTHrz_NWUQeF7g_GHa10T4Y",
  // Cloudflare Turnstile site key for the bot check (public). Empty turns the bot check off.
  turnstileSiteKey: "0x4AAAAAAGGBlOTISiDTUCHe",
};
