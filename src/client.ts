import type { PrismaUserFields, TypedPrismaClient } from "./user-fields";

/** Infer codec fields using a type-only reference to the server's prismaUserFields helper. */
export function inferAuthClient<Fields>() {
	return <A extends { $Infer: { Session: unknown } }>(
		client: A,
	): Fields extends PrismaUserFields<infer C, infer D>
		? TypedPrismaClient<A, C, D>
		: never => client as never;
}

/** @deprecated `inferPrismaClient` was renamed to `inferAuthClient`. */
export const inferPrismaClient = inferAuthClient;

export { prismaUserFields } from "./user-fields";
