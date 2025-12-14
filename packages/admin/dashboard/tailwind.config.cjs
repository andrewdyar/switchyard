const path = require("path")

// get the path of the dependency "@switchyard/ui"
const switchyardUI = path.join(
  path.dirname(require.resolve("@switchyard/ui")),
  "**/*.{js,jsx,ts,tsx}"
)

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@switchyard/ui-preset")],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", switchyardUI],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
}
