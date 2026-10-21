import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import {
  ordersApi,
  type ListOrdersParams,
  type ListOrdersResponse,
} from "../apis/ordersApi";

export function useOrders(params: ListOrdersParams) {
  const [data, setData] = useState<ListOrdersResponse | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const paramsKey = JSON.stringify(params);

  const refetch = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const parsedParams = JSON.parse(paramsKey) as ListOrdersParams;

    setIsFetching(true);
    setError(null);

    ordersApi
      .list(parsedParams, controller.signal)
      .then((res) => {
        setData(res.data);
        setIsLoading(false);
        setIsFetching(false);
      })
      .catch((err: unknown) => {
        if (axios.isCancel(err)) return;
        setError(
          err instanceof Error ? err : new Error("Failed to load orders"),
        );
        setIsLoading(false);
        setIsFetching(false);
      });

    return () => {
      controller.abort();
    };
  }, [paramsKey, reloadKey]);

  return {
    data,
    isLoading,
    isFetching,
    isError: error !== null,
    error,
    refetch,
  };
}
