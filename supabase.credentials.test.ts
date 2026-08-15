import { describe, expect, it } from "vitest";

describe("Supabase credentials", () => {
  it("authenticates a lightweight REST API request with the server secret", async () => {
    const url = process.env.SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    expect(url).toMatch(/^https:\/\/.+\.supabase\.co$/);
    expect(secret).toBeTruthy();

    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: secret!,
        Authorization: `Bearer ${secret!}`,
      },
    });

    expect(response.ok).toBe(true);
  });
});
