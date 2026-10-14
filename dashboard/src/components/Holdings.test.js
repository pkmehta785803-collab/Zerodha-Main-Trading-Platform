import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import axios from "axios";
import Holdings from "./Holdings";

jest.mock("axios", () => ({
  get: jest.fn(),
}));
jest.mock("./VerticalGraph", () => ({
  VerticalGraph: () => null,
}));

afterEach(() => {
  jest.clearAllMocks();
});

test("renders holdings and portfolio totals from the API response", async () => {
  axios.get.mockResolvedValue({
    data: [
      {
        _id: 1,
        name: "TCS",
        qty: "2",
        avg: "10.25",
        price: "12.50",
        net: "+21.95%",
        day: "+1.00%",
        isLoss: 0,
      },
    ],
  });

  render(<Holdings />);

  expect(await screen.findByText("TCS")).toBeInTheDocument();
  expect(screen.getByText("₹20.50")).toBeInTheDocument();
  expect(screen.getByText("₹25.00")).toBeInTheDocument();
  expect(screen.getByText("₹4.50 (21.95%)")).toBeInTheDocument();
});

test("shows a database error instead of substituting sample holdings", async () => {
  axios.get.mockRejectedValue({
    response: { data: { error: "MySQL is unavailable." } },
  });

  render(<Holdings />);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "MySQL is unavailable."
  );
  expect(screen.queryByText(/BHARTIARTL/)).not.toBeInTheDocument();
});

test("shows the empty state when the database has no holdings", async () => {
  axios.get.mockResolvedValue({ data: [] });

  render(<Holdings />);

  expect(
    await screen.findByText("No holdings are available in MySQL.")
  ).toBeInTheDocument();
});
