import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Toolbar,
  Typography,
  Paper,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { deleteOrder, type OrderStatus } from "../api/orders";
import { useAuth } from "../auth/AuthContext";
import { CreateOrderDialog } from "./CreateOrderDialog";
import { useOrders } from "./useOrders";

const STATUSES: Array<OrderStatus | ""> = [
  "",
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
];

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function OrdersPage() {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const qParam = searchParams.get("q") ?? "";
  const status = (searchParams.get("status") ?? "") as OrderStatus | "";
  const sort = (searchParams.get("sort") ?? "createdAt") as
    | "createdAt"
    | "totalCents";
  const dir = (searchParams.get("dir") ?? "desc") as "asc" | "desc";
  const page = Math.max(0, Number(searchParams.get("page") ?? "0"));
  const pageSize = Number(searchParams.get("pageSize") ?? "25");

  const [searchInput, setSearchInput] = useState(qParam);

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (searchInput === qParam) return;
      const next = new URLSearchParams(searchParams);
      if (searchInput) next.set("q", searchInput);
      else next.delete("q");
      next.set("page", "0");
      setSearchParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput, qParam, searchParams, setSearchParams]);

  const params = useMemo(
    () => ({
      q: qParam,
      status,
      sort,
      dir,
      page: page + 1,
      pageSize,
    }),
    [qParam, status, sort, dir, page, pageSize],
  );

  const { data, isFetching, isError, error, isLoading } = useOrders(params);

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  function updateParams(patch: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.set("page", "0");
    setSearchParams(next, { replace: true });
  }

  function toggleSort(field: "createdAt" | "totalCents") {
    if (sort === field) {
      updateParams({ dir: dir === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sort: field, dir: "desc" });
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky" elevation={0} color="transparent" sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Orders Console
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email} ({user?.role})
          </Typography>
          <Button onClick={logout}>Log out</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ mb: 2, alignItems: { md: "center" } }}
        >
          <TextField
            label="Search name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            size="small"
            sx={{ minWidth: 260 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              label="Status"
              value={status}
              onChange={(e) =>
                updateParams({ status: e.target.value || null })
              }
            >
              {STATUSES.map((value) => (
                <MenuItem key={value || "all"} value={value}>
                  {value || "All statuses"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            Create order
          </Button>
        </Stack>

        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(error as Error)?.message ?? "Failed to load orders"}
          </Alert>
        )}

        <Paper>
          <TableContainer>
            <Table size="small" aria-label="orders table">
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sortDirection={sort === "totalCents" ? dir : false}>
                    <TableSortLabel
                      active={sort === "totalCents"}
                      direction={sort === "totalCents" ? dir : "desc"}
                      onClick={() => toggleSort("totalCents")}
                    >
                      Amount
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sort === "createdAt" ? dir : false}>
                    <TableSortLabel
                      active={sort === "createdAt"}
                      direction={sort === "createdAt" ? dir : "desc"}
                      onClick={() => toggleSort("createdAt")}
                    >
                      Created
                    </TableSortLabel>
                  </TableCell>
                  {user?.role === "admin" && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  data?.items.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{order.customerEmail}</TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell>{formatMoney(order.totalCents)}</TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleString()}
                      </TableCell>
                      {user?.role === "admin" && (
                        <TableCell align="right">
                          <Button
                            size="small"
                            color="error"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(order.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                {!isLoading && data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      No orders match these filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
              {isFetching ? "Updating…" : `${data?.total ?? 0} orders`}
            </Typography>
            <TablePagination
              component="div"
              count={data?.total ?? 0}
              page={page}
              onPageChange={(_e, nextPage) =>
                updateParams({ page: String(nextPage) }, false)
              }
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) =>
                updateParams({ pageSize: e.target.value, page: "0" })
              }
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Stack>
        </Paper>
      </Container>

      <CreateOrderDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Box>
  );
}
