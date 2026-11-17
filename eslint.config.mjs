import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "no-alert": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='select']",
          message:
            "Dilarang menggunakan tag native <select>. Gunakan komponen Select/Combobox dari shadcn/ui.",
        },
        {
          selector:
            "JSXOpeningElement[name.name='input'] > JSXAttribute[name.name='type'][value.value='date']",
          message:
            "Dilarang menggunakan <input type='date'> native. Gunakan komponen Calendar + Popover dari shadcn/ui.",
        },
        {
          selector:
            "JSXOpeningElement[name.name='input'] > JSXAttribute[name.name='type'][value.expression.value='date']",
          message:
            "Dilarang menggunakan <input type='date'> native. Gunakan komponen Calendar + Popover dari shadcn/ui.",
        },
      ],
    },
  },
]);

export default eslintConfig;
