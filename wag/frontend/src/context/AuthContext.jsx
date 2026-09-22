import { createContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function AuthProvider({ children }) {
    const navigate = useNavigate();
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState(() => {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    });
    const [loading, setLoading] = useState(false);

    const isAuthenticated = useMemo(() => Boolean(token), [token]);

    useEffect(() => {
        // If token removed externally, ensure navigation
        if (!token) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }
    }, [token]);

    const login = async ({ nip, password }) => {
        setLoading(true);
        try {
            const res = await API.post("/auth/login", { nip, password });
            const { token: jwtToken, user: userData } = res.data || {};

            if (!jwtToken) {
                throw new Error("Login gagal: token tidak diterima");
            }

            setToken(jwtToken);
            setUser(userData || null);
            localStorage.setItem(TOKEN_KEY, jwtToken);
            localStorage.setItem(USER_KEY, JSON.stringify(userData || null));

            navigate("/", { replace: true });
            return res.data;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        navigate("/login", { replace: true });
    };

    // Optional: verify profile on app start
    useEffect(() => {
        const verify = async () => {
            if (!token) return;
            try {
                await API.get("/auth/profile");
            } catch {
                logout();
            }
        };
        verify();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = useMemo(
        () => ({
            token,
            user,
            loading,
            isAuthenticated,
            login,
            logout,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [token, user, loading, isAuthenticated]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

