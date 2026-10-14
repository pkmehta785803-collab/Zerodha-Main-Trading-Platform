import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Menu from "./Menu";

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      user: {
        _id: 17,
        name: "Demo User",
        email: "demo@example.com",
      },
    }),
  });
});

test("loads the signed-in user's account details for the dashboard profile", async () => {
  render(
    <MemoryRouter>
      <Menu />
    </MemoryRouter>
  );

  expect(await screen.findByText("Demo User")).toBeInTheDocument();
  expect(screen.getByText("demo@example.com")).toBeInTheDocument();
  expect(screen.getByText("DU")).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith("http://localhost:3001/me", {
    credentials: "include",
  });
  expect(JSON.parse(localStorage.getItem("zerodha-user"))).toMatchObject({
    _id: 17,
    name: "Demo User",
  });
});

test("links to login when the dashboard has no authenticated user", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 401,
    json: async () => ({ error: "No token provided." }),
  });

  render(
    <MemoryRouter>
      <Menu />
    </MemoryRouter>
  );

  expect(await screen.findByRole("link", { name: "Not logged in" })).toHaveAttribute(
    "href",
    "http://localhost:3003/login"
  );
});
