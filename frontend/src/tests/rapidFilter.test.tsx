import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { OrdersPage } from "../orders/OrdersPage";

vi.mock("../auth/AuthContext", async () => {
  const actual = await vi.importActual<typeof import("../auth/AuthContext")>(
    "../auth/AuthContext",
  );
  return {
    ...actual,
    useAuth: () => ({
      user: {
        sub: "agent-1",
        role: "agent" as const,
        email: "agent@example.com",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      login: async () => undefined,
      logout: () => undefined,
    }),
  };
});

function makeResponse(status: string) {
  return {
    items: [
      {
        id: `${status}-1`,
        customerName: `${status} Customer`,
        customerEmail: `${status}@example.com`,
        status,
        totalCents: 1000,
        createdAt: new Date().toISOString(),
        createdBy: "agent-1",
      },
    ],
    total: 1,
    page: 1,
    pageSize: 25,
  };
}

const server = setupServer(
  http.get("/api/orders", async ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "";
    if (status === "pending") {
      await delay(800);
      return HttpResponse.json(makeResponse("pending"));
    }
    if (status === "paid") {
      await delay(400);
      return HttpResponse.json(makeResponse("paid"));
    }
    if (status === "shipped") {
      await delay(50);
      return HttpResponse.json(makeResponse("shipped"));
    }
    return HttpResponse.json(makeResponse("all"));
  }),
);

function renderOrders(initial = "/orders") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initial]}>
          <OrdersPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("rapid filter changes", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => server.close());

  it("never shows stale results from an earlier slower request", async () => {
    const user = userEvent.setup();
    renderOrders();

    const statusSelect = await screen.findByLabelText("Status");

    await user.click(statusSelect);
    await user.click(await screen.findByRole("option", { name: "pending" }));

    await user.click(statusSelect);
    await user.click(await screen.findByRole("option", { name: "paid" }));

    await user.click(statusSelect);
    await user.click(await screen.findByRole("option", { name: "shipped" }));

    await waitFor(() => {
      expect(screen.getByText("shipped Customer")).toBeInTheDocument();
    });

    // Wait longer than the slowest mocked response.
    await new Promise((resolve) => setTimeout(resolve, 900));

    expect(screen.getByText("shipped Customer")).toBeInTheDocument();
    expect(screen.queryByText("pending Customer")).not.toBeInTheDocument();
    expect(screen.queryByText("paid Customer")).not.toBeInTheDocument();
  });
});
