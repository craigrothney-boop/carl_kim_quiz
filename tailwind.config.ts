import type { Config } from "tailwindcss";

/**
 * Brand colours (Carl & Kim):
 * - carl-green: primary actions (Carl’s jacket)
 * - kim-navy: secondary / info surfaces (Kim’s blazer)
 */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "carl-green": "#2D5A27",
        "kim-navy": "#1B2B5B",
      },
    },
  },
} satisfies Config;
