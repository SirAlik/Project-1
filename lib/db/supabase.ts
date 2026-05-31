'use client';

import { createBrowserClient } from '@supabase/ssr';
import { createMockClient, DEMO_DATA } from '@/lib/mock-data';

type BrowserClient = ReturnType<typeof createBrowserClient>;

export const supabase: BrowserClient =
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
        ? (createMockClient(DEMO_DATA) as unknown as BrowserClient)
        : createBrowserClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL    ?? 'https://placeholder.supabase.co',
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
          );
