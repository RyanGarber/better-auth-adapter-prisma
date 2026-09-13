import type { ClientFetchOption } from "@better-auth/core";
import type { DBFieldAttribute } from "@better-auth/core/db";
import type {
	ExtractFieldInputTypes,
	ExtractFieldOutputTypes,
} from "@prisma/orm-postgres/family-contract/types";
import type { Collection } from "@prisma/orm-postgres/orm-client";

type ContractModelShape = { input: unknown; output: unknown; fields: unknown };
type CollectionShape =
	| ContractModelShape
	| {
			first: (...args: never[]) => Promise<unknown>;
			create: (...args: never[]) => Promise<unknown>;
	  };
type Definitions = Record<string, DBFieldAttribute>;
type Output<C extends CollectionShape> = C extends ContractModelShape
	? C["output"]
	: C extends { first: (...args: never[]) => Promise<unknown> }
		? NonNullable<Awaited<ReturnType<C["first"]>>>
		: never;
type Input<C extends CollectionShape> = C extends ContractModelShape
	? C["input"]
	: C extends Collection<infer CT, infer M, infer _Row, infer State>
		? State["nsId"] extends keyof ExtractFieldInputTypes<CT>
			? M extends keyof ExtractFieldInputTypes<CT>[State["nsId"]]
				? ExtractFieldInputTypes<CT>[State["nsId"]][M]
				: never
			: never
		: never;
type StorageKey<D, K> = D extends { fieldName: infer F extends string } ? F : K;
type StoredField<Shape, D, K> =
	StorageKey<D, K> extends keyof Shape ? Shape[StorageKey<D, K>] : never;
type Fields<C extends CollectionShape> = C extends ContractModelShape
	? C["fields"]
	: C extends Collection<infer CT, infer M, infer _Row, infer State>
		? CT["domain"]["namespaces"][State["nsId"]]["models"][M] extends {
				fields: infer F;
			}
			? F
			: never
		: never;
type FieldCodec<C extends CollectionShape, D, K> =
	StorageKey<D, K> extends keyof Fields<C>
		? Fields<C>[StorageKey<D, K>] extends { type: { codecId: infer Codec } }
			? Codec
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

type ClientBody<
	B,
	C extends CollectionShape,
	D extends Definitions,
	Update,
> = Omit<NonNullable<B>, keyof D> &
	(Update extends true ? Partial<UserInput<C, D>> : UserInput<C, D>);

type ClientArgs<
	Args extends unknown[],
	C extends CollectionShape,
	D extends Definitions,
	Path,
> = Path extends "signUp.email" | "updateUser"
	? Args extends [unknown?, ...infer Rest]
		? Path extends "updateUser"
			? [body?: ClientBody<Args[0], C, D, true>, ...Rest]
			: [body: ClientBody<Args[0], C, D, false>, ...Rest]
		: Args
	: Args;

type FetchData<T> = T extends { error: null; data: infer Data }
	? Data
	: T extends { error: unknown; data: null }
		? never
		: T;

type ClientResult<R, F, C extends CollectionShape, D extends Definitions> =
	R extends Promise<infer Value>
		? Promise<
				ReplaceUser<F extends { throw: true } ? FetchData<Value> : Value, C, D>
			>
		: ReplaceUser<R, C, D>;

type WithFetchOptions<Args extends unknown[], F> = {
	[K in keyof Args]: K extends "0"
		? "fetchOptions" extends keyof NonNullable<Args[K]>
			? Omit<NonNullable<Args[K]>, "fetchOptions"> & { fetchOptions?: F }
			: Args[K]
		: K extends "1"
			? F
			: Args[K];
};

type ClientView<
	T,
	C extends CollectionShape,
	D extends Definitions,
	Path extends string = "",
> = T extends (...args: infer Args) => infer Result
	? Path extends "useSession" | `useSession.${string}`
		? (...args: Args) => ReplaceUser<Result, C, D>
		: <F extends ClientFetchOption = Record<never, never>>(
				...args: WithFetchOptions<ClientArgs<Args, C, D, Path>, F>
			) => ClientResult<Result, F, C, D>
	: T extends object
		? {
				[K in keyof T]: K extends "$fetch" | "$store" | "$ERROR_CODES"
					? T[K]
					: K extends "$Infer"
						? ReplaceUser<T[K], C, D>
						: ClientView<
								T[K],
								C,
								D,
								Path extends "" ? K & string : `${Path}.${K & string}`
							>;
			}
		: T;

/** A client type view; does not install a serializer or change client behavior. */
export type TypedPrismaClient<
	A,
	C extends CollectionShape,
	D extends Definitions,
> = ClientView<A, C, D>;

export interface PrismaUserFields<
	C extends CollectionShape,
	D extends Definitions,
> {
	additionalFields: D;
	/** Apply to a client configured with inferAdditionalFields<typeof auth>(). */
	inferClient<A extends { $Infer: { Session: unknown } }>(
		client: A,
	): TypedPrismaClient<A, C, D>;
	/** Apply after betterAuth({ user: { additionalFields } }). For direct server calls, not HTTP deserialization. */
	inferAuth<A extends AuthShape>(auth: A): TypedPrismaAuth<A, C, D>;
}

type ContractShape = {
	domain: {
		namespaces: Record<string, { models: Record<string, { fields: unknown }> }>;
	};
};
type ContractModel<
	CT extends ContractShape,
	NS extends keyof CT["domain"]["namespaces"],
	M extends keyof CT["domain"]["namespaces"][NS]["models"],
> = {
	input: NS extends keyof ExtractFieldInputTypes<CT>
		? M extends keyof ExtractFieldInputTypes<CT>[NS]
			? ExtractFieldInputTypes<CT>[NS][M]
			: never
		: never;
	output: NS extends keyof ExtractFieldOutputTypes<CT>
		? M extends keyof ExtractFieldOutputTypes<CT>[NS]
			? ExtractFieldOutputTypes<CT>[NS][M]
			: never
		: never;
	fields: CT["domain"]["namespaces"][NS]["models"][M]["fields"];
};

/** Derive codec types using only the generated Contract type; no database or JSON import is needed. */
export function prismaUserFields<
	CT extends ContractShape,
	NS extends keyof CT["domain"]["namespaces"],
	M extends keyof CT["domain"]["namespaces"][NS]["models"],
>(): FieldBuilder<ContractModel<CT, NS, M>>;
/** Compatibility form for an unprojected Prisma User collection. */
export function prismaUserFields<C extends CollectionShape>(
	collection: C,
): FieldBuilder<C>;
export function prismaUserFields(
	_collection?: CollectionShape,
): FieldBuilder<CollectionShape> {
	return createFieldBuilder<CollectionShape>();
}

type FieldBuilder<C extends CollectionShape> = ReturnType<
	typeof createFieldBuilder<C>
>;
function createFieldBuilder<C extends CollectionShape>() {
	return <const D extends Definitions>(
		definitions: D & {
			[K in keyof D]: StorageKey<D[K], K> extends keyof Output<C> &
				keyof Input<C>
				? D[K]
				: never;
		},
	): PrismaUserFields<C, D> => ({
		additionalFields: definitions,
		inferClient(client) {
			return client as unknown as TypedPrismaClient<typeof client, C, D>;
		},
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
