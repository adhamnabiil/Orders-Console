import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listOrders, type ListOrdersParams } from "../api/orders";

export function useOrders(params: ListOrdersParams) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: ({ signal }) => listOrders(params, signal),
    placeholderData: keepPreviousData,
  });
}
