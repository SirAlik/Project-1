// Supabase-like mock client — يُعيد البيانات التجريبية بدلاً من استعلام قاعدة البيانات الحقيقية
// يُستخدم حصراً عند NEXT_PUBLIC_DEMO_MODE=true

import type { DemoDataMap } from './demo-data';
import { DEMO_USER_ID, DEMO_SCHOOL_ID, DEMO_EMAIL } from './demo-data';

type Row = Record<string, unknown>;

interface QueryResult {
    data: Row[] | Row | null;
    error: null;
    count: number | null;
    status: number;
    statusText: string;
}

// بناء الاستعلام القابل للسلسلة والمُنتظَر
class MockQueryBuilder {
    private readonly _rows: Row[];
    private _filters: Array<(r: Row) => boolean> = [];
    private _orderCol: string | null = null;
    private _orderAsc = true;
    private _limitN:  number | null = null;
    private _offsetN  = 0;
    private _isMutation = false;
    private _isCountOnly = false;

    constructor(rows: Row[]) {
        this._rows = rows;
    }

    select(cols?: string, opts?: { count?: string; head?: boolean }): this {
        void cols;
        if (opts?.count) this._isCountOnly = true;
        return this;
    }

    eq(col: string, val: unknown): this {
        this._filters.push((r) => r[col] === val);
        return this;
    }

    neq(col: string, val: unknown): this {
        this._filters.push((r) => r[col] !== val);
        return this;
    }

    in(col: string, vals: unknown[]): this {
        this._filters.push((r) => vals.includes(r[col]));
        return this;
    }

    is(col: string, val: unknown): this {
        if (val === null) {
            this._filters.push((r) => r[col] == null);
        } else {
            this._filters.push((r) => r[col] === val);
        }
        return this;
    }

    not(): this { return this; }
    contains(): this { return this; }
    ilike(): this { return this; }
    gt(): this { return this; }
    gte(): this { return this; }
    lt(): this { return this; }
    lte(): this { return this; }

    order(col: string, opts?: { ascending?: boolean }): this {
        this._orderCol = col;
        this._orderAsc = opts?.ascending ?? true;
        return this;
    }

    limit(n: number): this {
        this._limitN = n;
        return this;
    }

    range(from: number, to: number): this {
        this._offsetN = from;
        this._limitN  = to - from + 1;
        return this;
    }

    insert(): this {
        this._isMutation = true;
        return this;
    }

    update(): this {
        this._isMutation = true;
        return this;
    }

    upsert(): this {
        this._isMutation = true;
        return this;
    }

    delete(): this {
        this._isMutation = true;
        return this;
    }

    single(): Promise<{ data: Row | null; error: null }> {
        return Promise.resolve({ data: this._filtered()[0] ?? null, error: null });
    }

    maybeSingle(): Promise<{ data: Row | null; error: null }> {
        const rows = this._filtered();
        return Promise.resolve({ data: rows[0] ?? null, error: null });
    }

    // يجعل الـ builder قابلاً للانتظار (thenable protocol)
    then<R>(
        onfulfilled: (value: QueryResult) => R | PromiseLike<R>
    ): Promise<R> {
        return Promise.resolve(this._resolve()).then(onfulfilled);
    }

    private _resolve(): QueryResult {
        if (this._isMutation) {
            return { data: null, error: null, count: null, status: 201, statusText: 'Created' };
        }
        const rows = this._filtered();
        if (this._isCountOnly) {
            return { data: null, error: null, count: rows.length, status: 200, statusText: 'OK' };
        }
        return { data: rows, error: null, count: rows.length, status: 200, statusText: 'OK' };
    }

    private _filtered(): Row[] {
        let rows = [...this._rows];
        for (const f of this._filters) {
            rows = rows.filter(f);
        }
        if (this._orderCol !== null) {
            const col = this._orderCol;
            const asc = this._orderAsc;
            rows.sort((a, b) => {
                const av = a[col];
                const bv = b[col];
                if (typeof av === 'string' && typeof bv === 'string') {
                    return asc ? av.localeCompare(bv) : bv.localeCompare(av);
                }
                if (typeof av === 'number' && typeof bv === 'number') {
                    return asc ? av - bv : bv - av;
                }
                return 0;
            });
        }
        if (this._offsetN > 0) rows = rows.slice(this._offsetN);
        if (this._limitN !== null) rows = rows.slice(0, this._limitN);
        return rows;
    }
}

// كائن المستخدم التجريبي — يُحاكي User من Supabase Auth
const DEMO_AUTH_USER = {
    id:           DEMO_USER_ID,
    email:        DEMO_EMAIL,
    aud:          'authenticated',
    role:         'authenticated',
    app_metadata: { role: 'school_principal', school_id: DEMO_SCHOOL_ID },
    user_metadata: { full_name: 'مدير النظام التجريبي' },
    created_at:   '2025-01-01T00:00:00Z',
    updated_at:   new Date().toISOString(),
} as const;

const DEMO_SESSION = {
    access_token:  'demo-access-token',
    refresh_token: 'demo-refresh-token',
    expires_in:    3600,
    token_type:    'bearer',
    user:          DEMO_AUTH_USER,
} as const;

type AuthChangeCallback = (event: string, session: typeof DEMO_SESSION | null) => void;

const mockAuth = {
    getUser:    () => Promise.resolve({ data: { user: DEMO_AUTH_USER },  error: null }),
    getSession: () => Promise.resolve({ data: { session: DEMO_SESSION }, error: null }),
    signInWithPassword: () =>
        Promise.resolve({ data: { user: DEMO_AUTH_USER, session: DEMO_SESSION }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback: AuthChangeCallback) => {
        // إشعار async لتجنب render loops
        setTimeout(() => callback('SIGNED_IN', DEMO_SESSION), 50);
        return { data: { subscription: { unsubscribe: () => {} } } };
    },
    refreshSession: () => Promise.resolve({ data: { session: DEMO_SESSION, user: DEMO_AUTH_USER }, error: null }),
};

// بناء الـ mock client الكامل
export function createMockClient(data: DemoDataMap) {
    return {
        from: (table: string) => new MockQueryBuilder((data[table] ?? []) as Row[]),
        auth: mockAuth,
        rpc: () => Promise.resolve({ data: null, error: null }),
        channel: () => ({
            on: function() { return this; },
            subscribe: () => ({ unsubscribe: () => {} }),
            unsubscribe: () => {},
        }),
        storage: {
            from: () => ({
                upload:       () => Promise.resolve({ data: null, error: null }),
                getPublicUrl: () => ({ data: { publicUrl: '' } }),
                download:     () => Promise.resolve({ data: null, error: null }),
                remove:       () => Promise.resolve({ data: null, error: null }),
            }),
        },
    };
}

export type MockClient = ReturnType<typeof createMockClient>;
