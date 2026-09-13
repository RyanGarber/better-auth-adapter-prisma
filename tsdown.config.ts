import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
    dts: {
        enabled: true,
        sourcemap: true,
    },
    sourcemap: true,
    skipNodeModulesBundle: true,
});