import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

const getQueryFn: QueryFunction = async ({ queryKey }) => {
  const url = queryKey[0] as string;
  const needsAuth = url.includes("/api/");
  const headers: Record<string, string> = {};
  
  if (needsAuth) {
    const key = sessionStorage.getItem("dtrack_api_key") || "changeme-replace-in-production";
    headers["Authorization"] = `Bearer ${key}`;
  }

  const res = await fetch(url, { headers });
  await throwIfResNotOk(res);
  return res.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: false,
    },
  },
});
