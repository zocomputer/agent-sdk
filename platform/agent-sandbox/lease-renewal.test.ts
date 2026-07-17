import { describe, expect, test } from "bun:test";
import { createLeaseRenewer } from "./lease-renewal";

// The mint-anchored lease renewal loop for the scratch sandbox path: while any
// work is live it re-mints on an interval anchored to the LAST SUCCESSFUL
// MINT (never to when work started), failures back off and retry, and an idle
// or disposed renewer never renews. Small real-timer intervals, the
// state-sandbox SDK test idiom.

const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("createLeaseRenewer", () => {
  test("renews on the interval while work is live and stops when it ends", async () => {
    let renews = 0;
    const renewer = createLeaseRenewer({
      renew: () => {
        renews += 1;
        return Promise.resolve();
      },
      intervalMs: 10,
    });
    renewer.workStarted();
    await tick(45);
    expect(renews).toBeGreaterThan(1);
    renewer.workEnded();
    const atEnd = renews;
    await tick(40);
    expect(renews).toBe(atEnd);
    renewer.dispose();
  });

  test("a fresh anchor defers the first renewal; a stale anchor renews immediately at work start", async () => {
    let renews = 0;
    const renewer = createLeaseRenewer({
      renew: () => {
        renews += 1;
        return Promise.resolve();
      },
      intervalMs: 60,
    });
    // Anchor is creation time: starting work right away must NOT renew inside
    // the interval (the first operation's own mint covers the lease).
    renewer.workStarted();
    await tick(15);
    expect(renews).toBe(0);
    renewer.workEnded();
    // Now the anchor goes stale while idle; late-starting work renews at once.
    await tick(70);
    renewer.workStarted();
    await tick(15);
    expect(renews).toBeGreaterThanOrEqual(1);
    renewer.workEnded();
    renewer.dispose();
  });

  test("noteMint re-anchors: an external mint pushes the next renewal out", async () => {
    let renews = 0;
    const renewer = createLeaseRenewer({
      renew: () => {
        renews += 1;
        return Promise.resolve();
      },
      intervalMs: 50,
    });
    await tick(40); // near the end of the creation anchor's interval
    renewer.noteMint(); // the connection manager just minted
    renewer.workStarted();
    await tick(25); // past the original anchor's due point, inside the new one
    expect(renews).toBe(0);
    renewer.workEnded();
    renewer.dispose();
  });

  test("a failed renewal backs off and retries while work stays live", async () => {
    let attempts = 0;
    const renewer = createLeaseRenewer({
      renew: () => {
        attempts += 1;
        return attempts === 1 ? Promise.reject(new Error("blip")) : Promise.resolve();
      },
      intervalMs: 10,
      retryDelayMs: 5,
    });
    renewer.workStarted();
    await tick(60);
    expect(attempts).toBeGreaterThan(1); // kept going past the failure
    renewer.workEnded();
    renewer.dispose();
  });

  test("dispose is terminal — no renewals afterward even with live work", async () => {
    let renews = 0;
    const renewer = createLeaseRenewer({
      renew: () => {
        renews += 1;
        return Promise.resolve();
      },
      intervalMs: 5,
    });
    renewer.workStarted();
    renewer.dispose();
    await tick(30);
    expect(renews).toBe(0);
  });

  test("overlapping work units hold one loop; the last end stops it", async () => {
    let renews = 0;
    const renewer = createLeaseRenewer({
      renew: () => {
        renews += 1;
        return Promise.resolve();
      },
      intervalMs: 8,
    });
    // Make the anchor stale so renewals flow immediately.
    await tick(15);
    renewer.workStarted();
    renewer.workStarted();
    await tick(30);
    renewer.workEnded();
    await tick(20);
    const whileOneLive = renews;
    expect(whileOneLive).toBeGreaterThan(1); // still renewing with one unit live
    renewer.workEnded();
    const atStop = renews;
    await tick(30);
    expect(renews).toBe(atStop);
    renewer.dispose();
  });
});
