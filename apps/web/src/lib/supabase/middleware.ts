import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import { resolveSessionRedirect } from '@/lib/auth-routing';

type SupabaseCookie = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    path?: string;
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none' | boolean;
    expires?: Date;
  };
};

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: SupabaseCookie[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectPath = resolveSessionRedirect(request.nextUrl.pathname, Boolean(user));

  if (redirectPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirectPath;
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
