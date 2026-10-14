const test = require("node:test");
const assert = require("node:assert/strict");

const { formatMysqlDateTime, startServer } = require("../index.js");

test("formats order timestamps for MySQL DATETIME columns", () => {
  assert.equal(
    formatMysqlDateTime(new Date("2026-10-10T18:10:10.123Z")),
    "2026-10-10 18:10:10.123"
  );
});

test("reports MySQL as unavailable when it is not configured", async () => {
  const server = await startServer({ port: 4311, mysqlUrl: "" });

  try {
    const response = await fetch("http://127.0.0.1:4311/health");
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.database, "unavailable");
  } finally {
    server.close();
  }
});

test("allows credentialed browser requests from the local dashboard", async () => {
  const server = await startServer({ port: 4314, mysqlUrl: "" });

  try {
    const response = await fetch("http://127.0.0.1:4314/me", {
      headers: { Origin: "http://localhost:3003" },
    });

    assert.equal(response.status, 503);
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      "http://localhost:3003"
    );
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  } finally {
    server.close();
  }
});

test("does not report database-backed writes as successful without MySQL", async () => {
  const server = await startServer({ port: 4312, mysqlUrl: "" });

  try {
    const response = await fetch("http://127.0.0.1:4312/newOrder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TCS",
        qty: 2,
        price: 300,
        mode: "BUY",
      }),
    });

    const payload = await response.json();
    assert.equal(response.status, 503);
    assert.match(payload.error, /MYSQL_URL/);
  } finally {
    server.close();
  }
});

test("requires MySQL for signup, login, and portfolio data", async () => {
  const server = await startServer({ port: 4313, mysqlUrl: "" });

  try {
    const signup = await fetch("http://127.0.0.1:4313/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Demo User",
        email: "demo@example.com",
        phone: "9876543210",
        password: "secret123",
      }),
    });
    const login = await fetch("http://127.0.0.1:4313/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@example.com", password: "secret123" }),
    });
    const holdings = await fetch("http://127.0.0.1:4313/allHoldings");
    const notification = await fetch("http://127.0.0.1:4313/notify-demo-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "Withdraw", amount: 10 }),
    });

    assert.equal(signup.status, 503);
    assert.equal(login.status, 503);
    assert.equal(holdings.status, 503);
    assert.equal(notification.status, 503);
  } finally {
    server.close();
  }
});
