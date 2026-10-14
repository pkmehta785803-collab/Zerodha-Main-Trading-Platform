import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import axios from "axios";
import Summary from "./Summary";

jest.mock("axios", () => ({
  get: jest.fn(),
}));

beforeEach(() => {
  axios.get.mockResolvedValue({
    data: [
      {
        name: "TCS",
        qty: "2",
        avg: "10",
        price: "12",
      },
    ],
  });
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ user: { name: "Demo User" } }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test("loads account and portfolio values from the API", async () => {
  render(<Summary />);

  expect(await screen.findByText("Hi, Demo User!")).toBeInTheDocument();
  expect(screen.getByText("Holdings (1)")).toBeInTheDocument();
  expect(screen.getByText("₹24")).toBeInTheDocument();
  expect(screen.getByText("₹20")).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { level: 3 })[1]).toHaveTextContent(
    "₹4 +20.00%"
  );
  expect(axios.get).toHaveBeenCalledWith("http://localhost:3001/allHoldings");
  expect(global.fetch).toHaveBeenCalledWith("http://localhost:3001/me", {
    credentials: "include",
  });
});
