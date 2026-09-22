/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Primary brand — single source of truth. Jangan pakai warna
                // biru/indigo/slate acak di luar token ini.
                brand: {
                    DEFAULT: "#534AB7",
                    hover: "#463DA1",
                    dark: "#3C3489",
                    soft: "#EFEEFB",
                    softer: "#F7F6FD",
                },
                surface: {
                    DEFAULT: "#F6F7F9",
                    card: "#FFFFFF",
                    muted: "#F9FAFB",
                    border: "#E5E7EB",
                    divider: "#EEF0F3",
                },
                txt: {
                    DEFAULT: "#0F172A",
                    secondary: "#475569",
                    muted: "#94A3B8",
                    placeholder: "#B4B2A9",
                },
                success: {
                    DEFAULT: "#15803D",
                    soft: "#DCFCE7",
                },
                warning: {
                    DEFAULT: "#B45309",
                    soft: "#FEF3C7",
                },
                danger: {
                    DEFAULT: "#B91C1C",
                    soft: "#FEE2E2",
                },
                info: {
                    DEFAULT: "#1D4ED8",
                    soft: "#DBEAFE",
                },
                neutral: {
                    DEFAULT: "#6B7280",
                    soft: "#F3F4F6",
                },
            },
            fontFamily: {
                sans: ["'DM Sans'", "'Instrument Sans'", "system-ui", "sans-serif"],
                mono: ["'DM Mono'", "ui-monospace", "monospace"],
            },
            boxShadow: {
                card: "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)",
                "card-hover": "0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)",
                modal: "0 24px 64px -12px rgba(15, 23, 42, 0.24)",
                popover: "0 12px 32px -8px rgba(15, 23, 42, 0.16)",
            },
            keyframes: {
                shimmer: {
                    "0%": { backgroundPosition: "-400px 0" },
                    "100%": { backgroundPosition: "400px 0" },
                },
                "fade-in": {
                    "0%": { opacity: "0", transform: "translateY(4px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
            animation: {
                shimmer: "shimmer 1.6s linear infinite",
                "fade-in": "fade-in 180ms ease-out",
            },
        },
    },
    plugins: [],
};
