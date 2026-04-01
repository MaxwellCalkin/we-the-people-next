@AGENTS.md

## Testing

    ### Philosophy
    Tests exist to give us confidence to deploy. Every test should answer: "What would break in production if this failed?"

    ### Guidelines
    - **Test behavior, not implementation.** Assert on outcomes users/callers care about, not internal details. If you can refactor
    the internals without breaking the test, the test is good.
    - **No mocking the database.** Use a real MongoDB connection for integration tests. Mock/prod divergence has burned us before.
    - **Test at the right level:**
      - API routes: test the full request/response cycle (HTTP method, auth, validation, response shape)
      - Library functions (e.g., `lib/trending.ts`, `lib/member-votes.ts`): unit test with real DB queries against seeded data
      - Components: test user-visible behavior, not component internals
    - **Each test should be independent.** No test should depend on another test's side effects. Clean up or use fresh data per test.
    - **Test the sad paths that matter.** Unauthorized access, invalid input, missing data, duplicate votes — these are production
    realities, not edge cases.
    - **Name tests as sentences describing behavior.** `"returns 401 when user is not authenticated"` not `"test auth check"`.
    - **No snapshot tests.** They create false confidence and break on every cosmetic change.
    - **Keep tests fast.** If a test takes more than a few seconds, something is wrong with the approach.
    - **Assert precisely.** Check specific values, not just `toBeTruthy()`. Check array lengths, specific fields, error messages.
    - **Test data should be obvious.** Inline the data that matters to the assertion. Don't hide it in fixtures or factories unless
    reuse is genuinely needed.

    You'll want to pick a testing framework too — this project currently has none configured. Vitest would be the natural fit since
    you're on Next.js 16 with TypeScript. It's fast, has native ESM/TypeScript support, and works well with the Next.js ecosystem.