import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createOrder } from "../api/orders";
import {
  computeTotalCents,
  createOrderSchema,
} from "../validation/orderSchema";

type Props = {
  open: boolean;
  onClose: () => void;
};

type ItemDraft = {
  productName: string;
  quantity: string;
  unitPriceCents: string;
};

const emptyItem = (): ItemDraft => ({
  productName: "",
  quantity: "1",
  unitPriceCents: "0",
});

export function CreateOrderDialog({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCustomerName("");
      setCustomerEmail("");
      setItems([emptyItem()]);
      setIdempotencyKey(crypto.randomUUID());
      setFormError(null);
    }
  }, [open]);

  const totalCents = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPriceCents) || 0;
      return sum + qty * price;
    }, 0);
  }, [items]);

  const mutation = useMutation({
    mutationFn: () => {
      const parsed = createOrderSchema.parse({
        customerName,
        customerEmail,
        items: items.map((item) => ({
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPriceCents: Number(item.unitPriceCents),
        })),
      });
      const total = computeTotalCents(parsed.items);
      return createOrder(
        {
          customerName: parsed.customerName,
          customerEmail: parsed.customerEmail,
          items: parsed.items,
          totalCents: total,
          status: "pending",
        },
        idempotencyKey,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
    onError: (err: unknown) => {
      const message =
        // axios error shape
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to create order";
      setFormError(message);
      // Keep the same idempotency key for retries / double-clicks.
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    try {
      createOrderSchema.parse({
        customerName,
        customerEmail,
        items: items.map((item) => ({
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPriceCents: Number(item.unitPriceCents),
        })),
      });
    } catch (err) {
      setFormError(
        err instanceof Error ? "Please fix the form errors" : "Invalid form",
      );
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create order</DialogTitle>
      <DialogContent>
        <Stack component="form" id="create-order-form" spacing={2} sx={{ mt: 1 }} onSubmit={onSubmit}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Customer email"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            required
            fullWidth
          />
          <Typography variant="subtitle2">Line items (1–5)</Typography>
          {items.map((item, index) => (
            <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                label="Product"
                value={item.productName}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...item, productName: e.target.value };
                  setItems(next);
                }}
                fullWidth
                required
              />
              <TextField
                label="Qty"
                type="number"
                value={item.quantity}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...item, quantity: e.target.value };
                  setItems(next);
                }}
                sx={{ width: { sm: 100 } }}
                required
              />
              <TextField
                label="Unit price (cents)"
                type="number"
                value={item.unitPriceCents}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...item, unitPriceCents: e.target.value };
                  setItems(next);
                }}
                sx={{ width: { sm: 160 } }}
                required
              />
              <IconButton
                aria-label="Remove item"
                disabled={items.length === 1}
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                ×
              </IconButton>
            </Stack>
          ))}
          <Button
            type="button"
            disabled={items.length >= 5}
            onClick={() => setItems([...items, emptyItem()])}
          >
            Add item
          </Button>
          <Typography fontWeight={600}>
            Total: ${(totalCents / 100).toFixed(2)}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          form="create-order-form"
          variant="contained"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Creating…" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
