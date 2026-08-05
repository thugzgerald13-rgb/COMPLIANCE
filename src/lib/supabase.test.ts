import { describe, expect, it } from 'vitest';
import { isSupabaseConfigured, supabase } from './supabase';

// Vite resolves import.meta.env at build time, so this module can only be
// exercised with whatever credentials the test run was started with. The
// invariant that must hold either way: a client exists exactly when the
// VITE_SUPABASE_* credentials are present and are not the .env.example
// placeholders, and the app never gets a half-initialized client.
describe('supabase client bootstrap', () => {
  it('exposes a client exactly when it reports being configured', () => {
    expect(isSupabaseConfigured).toBe(supabase !== null);
  });

  it('exposes an auth namespace whenever a client was created', () => {
    if (supabase) {
      expect(supabase.auth).toBeDefined();
      expect(supabase.storage).toBeDefined();
    } else {
      expect(isSupabaseConfigured).toBe(false);
    }
  });
});
