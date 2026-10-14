/* Songwriter settings: which Setlist database the Songwriter site saves lyrics to.
   NOW: the Setlist BETA site's database (Oct 2026), while the integration is tested there.
   Switch to live: copy the values from config-live.js (private) once the live database has the lyrics table.
   The key is the PUBLIC "anon" key (the same kind the Setlist sites already serve); it can only do what the
   database's access rules allow. Never put a secret / service_role key here. */
window.SW_CONFIG = {
  supabaseUrl: "https://hiepxfpvpieaqorqjnhx.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZXB4ZnB2cGllYXFvcnFqbmh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDQ3ODksImV4cCI6MjEwNDU4MDc4OX0._tYvF4i9NbvfQ3yekXCNa4HCAvx7veXcA5hAAv-ZE9k"
};
