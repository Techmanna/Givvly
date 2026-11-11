import { isAllowedCorsOrigin } from "./cors.util";

describe("isAllowedCorsOrigin", () => {
  it("allows undefined origins (server-to-server, curl, webhooks)", () => {
    expect(isAllowedCorsOrigin(undefined)).toBe(true);
    expect(isAllowedCorsOrigin("")).toBe(true);
  });

  it("allows Givvly production apex domain and www subdomain", () => {
    expect(isAllowedCorsOrigin("https://givvly.store")).toBe(true);
    expect(isAllowedCorsOrigin("https://www.givvly.store")).toBe(true);
    expect(isAllowedCorsOrigin("http://www.givvly.store")).toBe(true);
    expect(isAllowedCorsOrigin("https://www.givvly.store/")).toBe(true);
  });

  it("allows any Givvly subdomain", () => {
    expect(isAllowedCorsOrigin("https://admin.givvly.store")).toBe(true);
    expect(isAllowedCorsOrigin("https://app.givvly.store")).toBe(true);
    expect(isAllowedCorsOrigin("https://api.givvly.store")).toBe(true);
    expect(isAllowedCorsOrigin("https://staging.givvly.store")).toBe(true);
  });

  it("allows Vercel deployment and preview URLs", () => {
    expect(isAllowedCorsOrigin("https://givvly.vercel.app")).toBe(true);
    expect(isAllowedCorsOrigin("https://givvly-frontend-pr-12.vercel.app")).toBe(true);
  });

  it("allows localhost and 127.0.0.1 on various ports", () => {
    expect(isAllowedCorsOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedCorsOrigin("http://localhost:4000")).toBe(true);
    expect(isAllowedCorsOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(isAllowedCorsOrigin("http://127.0.0.1:5173")).toBe(true);
  });

  it("allows custom configured origins with or without trailing slash", () => {
    const configured = ["https://custom-partner.com", "https://another-domain.ng/"];
    expect(isAllowedCorsOrigin("https://custom-partner.com", configured)).toBe(true);
    expect(isAllowedCorsOrigin("https://custom-partner.com/", configured)).toBe(true);
    expect(isAllowedCorsOrigin("https://another-domain.ng", configured)).toBe(true);
  });

  it("rejects unauthorized external domains", () => {
    expect(isAllowedCorsOrigin("https://malicious-site.com")).toBe(false);
    expect(isAllowedCorsOrigin("https://givvly.store.evil.com")).toBe(false);
    expect(isAllowedCorsOrigin("https://notgivvly.store")).toBe(false);
  });
});
