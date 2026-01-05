/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./views/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./App.tsx",
        "./index.tsx",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": {
                    DEFAULT: "#D32F2F",
                    50: "#FFEBEE",
                    100: "#FFCDD2",
                    200: "#EF9A9A",
                    300: "#E57373",
                    400: "#EF5350",
                    500: "#D32F2F",
                    600: "#C62828",
                    700: "#B71C1C",
                    800: "#8E0000",
                    900: "#7F0000",
                },
                "zinc": {
                    950: "#09090b",
                    900: "#18181b",
                    800: "#27272a",
                }
            },
            fontFamily: {
                "display": ["Plus Jakarta Sans", "Inter", "sans-serif"]
            },
            boxShadow: {
                'premium': '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
                'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
            }
        },
    },
    plugins: [],
}
