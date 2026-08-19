import type { User } from "@supabase/supabase-js";
import type { CustomerProfile } from "@/types/domain";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getClient,
  getCustomerProfile,
  signInWithEmail,
  signOut,
  signUpWithEmail,
} from "./supabase";

interface AuthContextValue {
  user: User | null;
  profile: CustomerProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  signIn: (
    email: string,
    password: string,
  ) => ReturnType<typeof signInWithEmail>;
  signUp: (
    email: string,
    password: string,
    metadata?: { full_name?: string; phone?: string },
  ) => ReturnType<typeof signUpWithEmail>;
  logout: () => Promise<void>;
  reloadProfile: () => Promise<CustomerProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (
    userId: string | undefined,
  ): Promise<CustomerProfile | null> => {
    if (!userId) {
      setProfile(null);

      return null;
    }

    const { data } = await getCustomerProfile(userId);

    setProfile(data || null);

    return data || null;
  };

  useEffect(() => {
    const sb = getClient();

    if (!sb) {
      setLoading(false);

      return undefined;
    }

    let mounted = true;

    sb.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const nextUser = data?.session?.user || null;

      setUser(nextUser);
      if (nextUser) await refreshProfile(nextUser.id);
      setLoading(false);
    });

    const { data: listener } = sb.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const nextUser = session?.user || null;

        setUser(nextUser);

        if (nextUser) {
          // Defer the profile query so auth state processing is not blocked.
          setTimeout(() => {
            if (mounted) refreshProfile(nextUser.id);
          }, 0);
        } else {
          setProfile(null);
        }

        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAuthenticated: !!user,
      isVerified: !!user?.email_confirmed_at,

      async signIn(email: string, password: string) {
        const result = await signInWithEmail(email, password);

        if (!result.error && result.data?.user) {
          setUser(result.data.user);
          await refreshProfile(result.data.user.id);
        }

        return result;
      },

      async signUp(
        email: string,
        password: string,
        metadata?: { full_name?: string; phone?: string },
      ) {
        return signUpWithEmail(email, password, metadata);
      },

      async logout() {
        await signOut();
        setUser(null);
        setProfile(null);
      },

      async reloadProfile() {
        return refreshProfile(user?.id);
      },
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
