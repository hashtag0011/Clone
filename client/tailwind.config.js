/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // iOS System Colors & Glass Theme
                ios: {
                    primary: "#0A84FF", // Dark mode iOS Blue
                    secondary: "#5E5CE6", // Dark mode iOS Indigo
                    background: "#000000",
                    surface: "#1C1C1E",
                    "glass-card": "rgba(30, 30, 32, 0.70)", // Translucent card
                    "glass-border": "rgba(255, 255, 255, 0.12)",
                    text: "#FFFFFF",
                    "text-secondary": "#98989D", // iOS Gray
                    separator: "#38383A",
                    danger: "#FF453A", // Dark mode iOS Red
                    success: "#32D74B", // Dark mode iOS Green
                    incoming: "rgba(255, 255, 255, 0.1)", // Glass bubble
                    outgoing: "#0A84FF", // Solid blue bubble
                    input: "rgba(118, 118, 128, 0.24)", // iOS Search Bar color
                }
            },
            backdropBlur: {
                xs: '2px',
                md: '12px',
                xl: '20px',
                '2xl': '40px',
                '3xl': '60px',
            },
            animation: {
                "float": "float 8s ease-in-out infinite",
                "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "scale-in": "scaleIn 0.2s ease-out",
                "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)", // Apple spring curve
            },
            keyframes: {
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-15px)" },
                },
                scaleIn: {
                    "0%": { transform: "scale(0.9)", opacity: 0 },
                    "100%": { transform: "scale(1)", opacity: 1 },
                },
                slideUp: {
                    "0%": { transform: "translateY(20px)", opacity: 0 },
                    "100%": { transform: "translateY(0)", opacity: 1 },
                }
            },
            fontFamily: {
                sans: [
                    '-apple-system',
                    'BlinkMacSystemFont',
                    '"Segoe UI"',
                    'Roboto',
                    'Helvetica',
                    'Arial',
                    'sans-serif',
                ],
            }
        },
    },
    plugins: [],
}
