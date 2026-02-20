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
                    bg: "#F0F4F8",
                    surface: "#FFFFFF",
                    primary: "#2B3A4E",
                    accent: "#3B82F6",
                    text: "#1E293B",
                    "text-secondary": "#94A3B8",
                    incoming: "#E8EDF2",
                    outgoing: "#2B3A4E",
                    separator: "#E2E8F0",
                    online: "#22C55E",
                    unread: "#3B82F6",
                    "tab-bg": "#E8EDF2",
                    "tab-active": "#2B3A4E",
                    danger: "#EF4444",
                    input: "#F1F5F9",
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
