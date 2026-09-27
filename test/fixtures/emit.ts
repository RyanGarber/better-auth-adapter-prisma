import { defineConfig } from "@prisma/orm-postgres/config";
import { executeContractEmit } from "@prisma/orm-toolchain/cli/control-api";
import { extension } from "./schemas.ts";

const result = await executeContractEmit({
	config: defineConfig({
		contract: `${import.meta.dirname}/contract.prisma`,
		extensions: [extension.control],
	}),
	cwd: process.cwd(),
});
console.log(result.files);
