import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ordersApi } from "../apis/ordersApi";
import {
  PRODUCT_CATALOG,
  formatDollars,
  getCatalogPrice,
  type CatalogProductName,
} from "../data/catalog";
import { createOrderSchema } from "../validation/orderSchema";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

type ItemDraft = {
  productName: CatalogProductName;
  quantity: string;
};

const defaultProduct = PRODUCT_CATALOG[0].productName;

const emptyItem = (): ItemDraft => ({
  productName: defaultProduct,
  quantity: "1",
});

export function CreateOrderDialog({ open, onClose, onCreated }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomerName("");
      setCustomerEmail("");
      setItems([emptyItem()]);
      setIdempotencyKey(crypto.randomUUID());
      setFormError(null);
      setIsPending(false);
    }
  }, [open]);

  const totalCents = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = getCatalogPrice(item.productName) ?? 0;
      return sum + qty * price;
    }, 0);
  }, [items]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    let parsed;
    try {
      parsed = createOrderSchema.parse({
        customerName,
        customerEmail,
        items: items.map((item) => ({
          productName: item.productName,
          quantity: Number(item.quantity),
        })),
      });
    } catch {
      setFormError("Please fix the form errors");
      return;
    }

    setIsPending(true);
    try {
      await ordersApi.create(
        {
          customerName: parsed.customerName,
          customerEmail: parsed.customerEmail,
          items: parsed.items,
        },
        idempotencyKey,
      );
      onCreated();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to create order";
      setFormError(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create order</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="create-order-form"
          spacing={2}
          sx={{ mt: 1 }}
          onSubmit={onSubmit}
        >
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
          {items.map((item, index) => {
            const unitPrice = getCatalogPrice(item.productName) ?? 0;
            return (
              <Stack
                key={index}
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ alignItems: { sm: "center" } }}
              >
                <FormControl fullWidth size="small" required>
                  <InputLabel id={`product-${index}`}>Product</InputLabel>
                  <Select
                    labelId={`product-${index}`}
                    label="Product"
                    value={item.productName}
                    onChange={(e) => {
                      const next = [...items];
                      next[index] = {
                        ...item,
                        productName: e.target.value as CatalogProductName,
                      };
                      setItems(next);
                    }}
                  >
                    {PRODUCT_CATALOG.map((product) => (
                      <MenuItem
                        key={product.productName}
                        value={product.productName}
                      >
                        {product.productName} (
                        {formatDollars(product.unitPriceCents)})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Qty"
                  type="number"
                  size="small"
                  value={item.quantity}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...item, quantity: e.target.value };
                    setItems(next);
                  }}
                  sx={{ width: { sm: 100 } }}
                  required
                  slotProps={{ htmlInput: { min: 1 } }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ minWidth: 72, whiteSpace: "nowrap" }}
                >
                  {formatDollars(unitPrice)}
                </Typography>
                <IconButton
                  aria-label="Remove item"
                  disabled={items.length === 1}
                  onClick={() =>
                    setItems(items.filter((_, i) => i !== index))
                  }
                >
                  ×
                </IconButton>
              </Stack>
            );
          })}
          <Button
            type="button"
            disabled={items.length >= 5}
            onClick={() => setItems([...items, emptyItem()])}
          >
            Add item
          </Button>
          <Typography sx={{ fontWeight: 600 }}>
            Total: {formatDollars(totalCents)}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          form="create-order-form"
          variant="contained"
          disabled={isPending}
        >
          {isPending ? "Creating…" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
