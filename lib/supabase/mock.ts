// Shared mock implementations for Supabase client
const createFilterBuilder = () => ({
  data: [],
  error: null,
  eq: () => createFilterBuilder(),
  in: () => ({
    data: [],
    error: null,
    order: () => ({
      data: [],
      error: null,
      limit: () => ({ data: [], error: null })
    })
  }),
  single: () => ({ data: null, error: null }),
  order: () => ({
    data: [],
    error: null,
    limit: () => ({ data: [], error: null })
  }),
  select: () => ({ data: null, error: null, single: () => ({ data: null, error: null }) })
});

export const createMockAuth = () => ({
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
  signUp: async () => ({ data: { user: null, session: null }, error: null }),
  signOut: async () => ({ error: null }),
  resetPasswordForEmail: async () => ({ data: {}, error: null }),
  updateUser: async () => ({ data: { user: null }, error: null }),
  signInWithOtp: async () => ({ data: {}, error: null }),
  signInWithOAuth: async () => ({ data: { provider: null, url: null }, error: null }),
  verifyOtp: async () => ({ data: { session: null, user: null }, error: null }),
  onAuthStateChange: () => ({
    data: { subscription: { unsubscribe: () => {} } },
    error: null
  })
});

export const createMockFrom = () => ({
  select: () => ({
    data: [], 
    error: null,
    eq: () => ({
      data: [], 
      error: null,
      eq: () => ({
        data: [],
        error: null,
        single: () => ({ data: null, error: null })
      }),
      single: () => ({ data: null, error: null }),
      order: () => ({
        data: [], 
        error: null,
        limit: () => ({ data: [], error: null })
      })
    }),
    in: () => ({
      data: [],
      error: null,
      order: () => ({
        data: [],
        error: null,
        limit: () => ({ data: [], error: null })
      })
    }),
    order: () => ({
      data: [], 
      error: null,
      limit: () => ({ data: [], error: null })
    }),
    single: () => ({ data: null, error: null })
  }),
  insert: () => ({
    data: null, 
    error: null,
    select: () => ({
      data: null,
      error: null,
      single: () => ({ data: null, error: null })
    })
  }),
  update: () => ({
    data: null,
    error: null,
    eq: () => ({
      data: null,
      error: null,
      select: () => ({
        data: null,
        error: null,
        single: () => ({ data: null, error: null })
      })
    })
  }),
  delete: () => ({
    data: null, 
    error: null,
    eq: () => ({ data: null, error: null })
  }),
  upsert: () => ({
    data: null, 
    error: null,
    select: () => ({
      data: null,
      error: null,
      single: () => ({ data: null, error: null })
    })
  })
});

export const createMockClient = () => ({
  auth: createMockAuth(),
  from: createMockFrom
}); 