import useSWRImmutable from "swr/immutable";
import { api } from "../lib/bknd";

const fetchUser = () => api.auth.me();

export function useUser() {
  const { data, error, isLoading } = useSWRImmutable("/api/auth/me", fetchUser);

  return {
    user: data?.user ?? null,
    isLoading,
    isError: error,
  };
}
