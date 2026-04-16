import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest/presets/default-esm",
    testEnvironment: "node",
    extensionsToTreatAsEsm: [".ts"],
    moduleNameMapper: {
        // Rewrite .js imports to the actual .ts source files
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                useESM: true,
                tsconfig: {
                    // ts-jest doesn't support verbatimModuleSyntax
                    verbatimModuleSyntax: false,
                },
            },
        ],
    },
};

export default config;
