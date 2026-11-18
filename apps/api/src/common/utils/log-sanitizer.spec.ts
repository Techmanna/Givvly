import { sanitizeForLog } from "./log-sanitizer";

describe("sanitizeForLog", () => {
  it("redacts sensitive keys recursively", () => {
    const input = {
      email: "ada@example.com",
      password: "SuperSecretPassword123",
      nested: {
        walletPin: "1234",
        bvn: "22222222222",
        accessToken: "abc.def.ghi",
        amountKobo: 500000,
      },
    };

    const result = sanitizeForLog(input) as any;
    expect(result.email).toBe("ada@example.com");
    expect(result.password).toBe("[REDACTED]");
    expect(result.nested.walletPin).toBe("[REDACTED]");
    expect(result.nested.bvn).toBe("[REDACTED]");
    expect(result.nested.accessToken).toBe("[REDACTED]");
    expect(result.nested.amountKobo).toBe(500000);
  });

  it("redacts Bearer tokens and JWT strings even under generic keys", () => {
    const result = sanitizeForLog({
      header: "Bearer my-secret-token",
      payload: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signaturepart",
    }) as any;

    expect(result.header).toBe("Bearer [REDACTED]");
    expect(result.payload).toBe("[REDACTED_JWT]");
  });

  it("handles circular references and long arrays safely", () => {
    const obj: any = { name: "test", items: Array.from({ length: 15 }, (_, i) => i) };
    obj.self = obj;

    const result = sanitizeForLog(obj) as any;
    expect(result.self).toBe("[Circular]");
    expect(result.items).toHaveLength(11);
    expect(result.items[10]).toBe("…[5 more items]");
  });
});
