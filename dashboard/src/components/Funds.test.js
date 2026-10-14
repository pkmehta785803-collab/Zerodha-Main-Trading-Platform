import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import Funds from "./Funds";

jest.mock("axios", () => ({ post: jest.fn() }));

const renderFunds = () =>
  render(
    <MemoryRouter>
      <Funds />
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  axios.post.mockResolvedValue({
    data: {
      notification: {
        sms: { status: "sent", message: "SMS sent." },
      },
    },
  });
});

test("adds demo funds and updates the displayed and saved balance", async () => {
  renderFunds();

  fireEvent.click(screen.getByRole("button", { name: "Add funds" }));
  fireEvent.change(screen.getByLabelText("Amount (₹)"), {
    target: { value: "250.50" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirm add funds" }));

  expect(screen.getAllByText("4,293.60")).toHaveLength(3);
  expect(screen.getByText("250.50")).toBeInTheDocument();
  expect(await screen.findByRole("status")).toHaveTextContent(
    "recorded in demo mode"
  );
  expect(JSON.parse(localStorage.getItem("zerodha-demo-funds"))).toMatchObject({
    balance: 4293.6,
    payin: 250.5,
  });
});

test("withdraws demo funds and persists the remaining balance", async () => {
  renderFunds();

  fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
  fireEvent.change(screen.getByLabelText("Amount (₹)"), {
    target: { value: "43.10" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirm withdraw" }));

  expect(screen.getAllByText("4,000.00")).toHaveLength(3);
  expect(await screen.findByRole("status")).toHaveTextContent("SMS sent");
  expect(JSON.parse(localStorage.getItem("zerodha-demo-funds"))).toMatchObject({
    balance: 4000,
    payout: 43.1,
  });
});

test("rejects withdrawals greater than the available demo balance", () => {
  renderFunds();

  fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
  fireEvent.change(screen.getByLabelText("Amount (₹)"), {
    target: { value: "5000" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirm withdraw" }));

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Withdrawal amount exceeds your available cash."
  );
  expect(localStorage.getItem("zerodha-demo-funds")).toBeNull();
});

test("links the commodity account action to signup", () => {
  renderFunds();

  expect(screen.getByRole("link", { name: "Open Account" })).toHaveAttribute(
    "href",
    "http://localhost:3003/signup"
  );
});
