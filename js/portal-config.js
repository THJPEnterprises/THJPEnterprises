/* THJP Enterprises — Stockist Portal configuration
   Paste in the two values from YOUR THJP Supabase project:
   Supabase → Project Settings → API → "Project URL" and the "anon / publishable" key.
   The publishable key is safe to have in the website — the database's security
   rules (RLS + two-factor) decide what anyone can see.
   While these are empty the portal shows a "not connected yet" message
   (or a demo with sample data if you add ?demo=1 to the address). */
window.THJP_PORTAL = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  IDLE_MINUTES: 30,          // auto sign-out after this many minutes of inactivity
  CONTACT_EMAIL: 'info@thjpenterprises.com'
};
