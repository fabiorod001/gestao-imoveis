import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  return {
    user: { id: 1, name: "Usuario" },
    isLoading: false,
    isAuthenticated: true,  // <- SEMPRE TRUE (sem autenticação)
  };
}
