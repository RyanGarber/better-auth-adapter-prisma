import type { PrismaUserFields, TypedPrismaClient } from "./user-fields";

/** Infer codec fields using a type-only reference to the server's prismaUserFields helper. */
export function inferPrismaClient<Fields>() {
	return <A extends { $Infer: { Session: unknown } }>(
		client: A,
	): Fields extends PrismaUserFields<infer C, infer D>
		? TypedPrismaClient<A, C, D>
		: never => client as never;
}
