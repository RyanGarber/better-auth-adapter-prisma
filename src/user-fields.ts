import type { DBFieldAttribute } from "@better-auth/core/db";
import type { ExtractFieldInputTypes } from "@prisma/orm-postgres/family-contract/types";
import type { Collection } from "@prisma/orm-postgres/orm-client";

type CollectionShape = {
	first: (...args: never[]) => Promise<unknown>;
	create: (...args: never[]) => Promise<unknown>;
};
type Definitions = Record<string, DBFieldAttribute>;
type Output<C extends CollectionShape> = NonNullable<
	Awaited<ReturnType<C["first"]>>
>;
type Input<C extends CollectionShape> =
	C extends Collection<infer CT, infer M, infer _Row, infer State>
		? State["nsId"] extends keyof ExtractFieldInputTypes<CT>
			? M extends keyof ExtractFieldInputTypes<CT>[State["nsId"]]
				? ExtractFieldInputTypes<CT>[State["nsId"]][M]
				: never
			: never
		: never;
type StorageKey<D, K> = D extends { fieldName: infer F extends string } ? F : K;
type StoredField<Shape, D, K> =
	StorageKey<D, K> extends keyof Shape ? Shape[StorageKey<D, K>] : never;
type FieldCodec<C extends CollectionShape, D, K> =
	C extends Collection<infer CT, infer M, infer _Row, infer State>
		? CT["domain"]["namespaces"][State["nsId"]]["models"][M] extends {
				fields: infer Fields;
			}
			? StorageKey<D, K> extends keyof Fields
				? Fields[StorageKey<D, K>] extends { type: { codecId: infer Codec } }
					? Codec
					: never
				: never
			: never
		: never;
type BuiltinDateCodec =
	`pg/${"timestamptz" | "timestamp" | "date"}-${"temporal" | "string"}@1`;
type FieldValue<Shape, C extends CollectionShape, D, K> = D extends {
	type: "date";
}
	? [FieldCodec<C, D, K>] extends [never]
		? StoredField<Shape, D, K>
		: FieldCodec<C, D, K> extends BuiltinDateCodec
			? Date | Extract<StoredField<Shape, D, K>, null | undefined>
			: StoredField<Shape, D, K>
	: StoredField<Shape, D, K>;
type RequiredInput<D> = D extends
	| { required: false }
	| { defaultValue: unknown }
	? false
	: true;

type UserInput<C extends CollectionShape, D extends Definitions> = {
	-readonly [K in keyof D as D[K] extends { input: false }
		? never
		: RequiredInput<D[K]> extends true
			? K
			: never]: FieldValue<Input<C>, C, D[K], K>;
} & {
	-readonly [K in keyof D as D[K] extends { input: false }
		? never
		: RequiredInput<D[K]> extends false
			? K
			: never]?: FieldValue<Input<C>, C, D[K], K>;
};
type UserOutput<C extends CollectionShape, D extends Definitions> = {
	-readonly [K in keyof D as D[K] extends { returned: false }
		? never
		: D[K] extends { required: false }
			? never
			: K]: FieldValue<Output<C>, C, D[K], K>;
} & {
	-readonly [K in keyof D as D[K] extends { returned: false }
		? never
		: D[K] extends { required: false }
			? K
			: never]?: FieldValue<Output<C>, C, D[K], K> | null;
};

type ReplaceUser<
	T,
	C extends CollectionShape,
	D extends Definitions,
> = T extends {
	id: string;
	email: string;
	emailVerified: boolean;
	name: string;
}
	? Omit<T, keyof D> & UserOutput<C, D>
	: T extends Date | Response | Headers | Map<unknown, unknown> | Set<unknown>
		? T
		: T extends readonly unknown[]
			? { [K in keyof T]: ReplaceUser<T[K], C, D> }
			: T extends object
				? { [K in keyof T]: ReplaceUser<T[K], C, D> }
				: T;

type Endpoint = (...args: never[]) => unknown;
type Context<E extends Endpoint> = NonNullable<Parameters<E>[0]>;
type BodyContext<
	E extends Endpoint,
	K,
	C extends CollectionShape,
	D extends Definitions,
> = K extends "signUpEmail" | "updateUser"
	? Omit<Context<E>, "body"> & {
			body: Omit<Context<E> extends { body?: infer B } ? B : object, keyof D> &
				(K extends "updateUser" ? Partial<UserInput<C, D>> : UserInput<C, D>);
		}
	: Context<E>;
type Flags = "asResponse" | "returnHeaders" | "returnStatus";
type EndpointResult<
	T,
	R extends boolean,
	H extends boolean,
	S extends boolean,
> = R extends true
	? Response
	: H extends true
		? S extends true
			? { headers: Headers; status: number; response: T }
			: { headers: Headers; response: T }
		: S extends true
			? { status: number; response: T }
			: T;
type Call<E extends Endpoint, B, T> = undefined extends Parameters<E>[0]
	? <
			R extends boolean = false,
			H extends boolean = false,
			S extends boolean = false,
		>(
			context?: Omit<B, Flags> & {
				asResponse?: R | undefined;
				returnHeaders?: H | undefined;
				returnStatus?: ("returnStatus" extends keyof B ? S : never) | undefined;
			},
		) => Promise<EndpointResult<T, R, H, S>>
	: <
			R extends boolean = false,
			H extends boolean = false,
			S extends boolean = false,
		>(
			context: Omit<B, Flags> & {
				asResponse?: R | undefined;
				returnHeaders?: H | undefined;
				returnStatus?: ("returnStatus" extends keyof B ? S : never) | undefined;
			},
		) => Promise<EndpointResult<T, R, H, S>>;

type AuthShape = {
	api: object;
	$Infer: { Session: unknown };
	options: { user?: { additionalFields?: Definitions } };
};

/** A server-side type view. Runtime calls and Better Auth's HTTP handler are unchanged. */
export type TypedPrismaAuth<
	A extends AuthShape,
	C extends CollectionShape,
	D extends Definitions,
> = Omit<A, "api" | "$Infer"> & {
	$Infer: ReplaceUser<A["$Infer"], C, D>;
	api: {
		[K in keyof A["api"]]: A["api"][K] extends Endpoint
			? Pick<A["api"][K], keyof A["api"][K]> &
					Call<
						A["api"][K],
						BodyContext<A["api"][K], K, C, D>,
						K extends "getSession"
							? ReplaceUser<A["$Infer"]["Session"], C, D> | null
							: ReplaceUser<Awaited<ReturnType<A["api"][K]>>, C, D>
					>
			: A["api"][K];
	};
};

export interface PrismaUserFields<
	C extends CollectionShape,
	D extends Definitions,
> {
	additionalFields: D;
	/** Apply after betterAuth({ user: { additionalFields } }). For direct server calls, not HTTP deserialization. */
	inferAuth<A extends AuthShape>(auth: A): TypedPrismaAuth<A, C, D>;
}

/** Derive field input/output types from an unprojected Prisma User collection, including extension codecs. */
export function prismaUserFields<C extends CollectionShape>(_collection: C) {
	return <const D extends Definitions>(
		definitions: D & {
			[K in keyof D]: StorageKey<D[K], K> extends keyof Output<C> &
				keyof Input<C>
				? D[K]
				: never;
		},
	): PrismaUserFields<C, D> => ({
		additionalFields: definitions,
		inferAuth(auth) {
			if (auth.options.user?.additionalFields !== definitions) {
				throw new Error(
					"Pass this helper's additionalFields to betterAuth({ user: { additionalFields } }) before inferAuth().",
				);
			}
			return auth as unknown as TypedPrismaAuth<typeof auth, C, D>;
		},
	});
}
