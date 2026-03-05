/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                chatx: {
                    bg: "var(--color-bg)",
                    surface: "var(--color-surface)",
                    primary: "var(--color-primary)",
                    accent: "var(--color-accent)",
                    text: "var(--color-text)",
                    "text-secondary": "var(--color-text-secondary)",
                    incoming: "var(--color-incoming)",
                    outgoing: "var(--color-outgoing)",
                    separator: "var(--color-separator)",
                    online: "#22C55E",
                    unread: "var(--color-accent)",
                    "tab-bg": "var(--color-tab-bg)",
                    "tab-active": "var(--color-tab-active)",
                    danger: "#EF4444",
                    input: "var(--color-input)",
                },
            },
            animation: {
                "scale-in": "scaleIn 0.2s ease-out",
                "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                "fade-in": "fadeIn 0.3s ease-out",
                "bounce-in": "bounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            },
            keyframes: {
                scaleIn: {
                    "0%": { transform: "scale(0.9)", opacity: 0 },
                    "100%": { transform: "scale(1)", opacity: 1 },
                },
                slideUp: {
                    "0%": { transform: "translateY(20px)", opacity: 0 },
                    "100%": { transform: "translateY(0)", opacity: 1 },
                },
                fadeIn: {
                    "0%": { opacity: 0 },
                    "100%": { opacity: 1 },
                },
                bounceIn: {
                    "0%": { transform: "scale(0.3)", opacity: 0 },
                    "50%": { transform: "scale(1.05)" },
                    "100%": { transform: "scale(1)", opacity: 1 },
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
