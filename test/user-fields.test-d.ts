import postgres from "@prisma/orm-postgres/runtime";
import { betterAuth } from "better-auth";
import { expectTypeOf } from "vitest";
import { prismaAdapter, prismaUserFields } from "../src/index";
import type { Contract } from "./fixtures/contract";
import contractJson from "./fixtures/contract.json";
import { extension } from "./fixtures/schemas";

it("infers codec inputs and outputs through the server API", () => {
	const db = postgres<Contract>({
		contractJson,
		extensions: [extension.runtime],
	});
	const fields = prismaUserFields(db.orm.adapter_test.User)({
		profile: { type: "json", required: true },
		rich: { type: "json", required: false },
		lastSeen: { type: "date", required: false },
		nickname: { type: "string", fieldName: "role", required: false },
		secret: { type: "string", input: false, returned: false },
	});
	const auth = fields.inferAuth(
		betterAuth({
			database: prismaAdapter(db),
			user: { additionalFields: fields.additionalFields },
		}),
	);
	expectTypeOf<typeof auth.$Infer.Session.user.profile>().toEqualTypeOf<{
		name: string;
		age: number;
	}>();
	expectTypeOf<
		NonNullable<typeof auth.$Infer.Session.user.rich>["count"]
	>().toEqualTypeOf<bigint>();
	expectTypeOf<typeof auth.$Infer.Session.user.nickname>().toEqualTypeOf<
		string | null | undefined
	>();
	// @ts-expect-error Secret is excluded from responses.
	auth.$Infer.Session.user.secret;
	// @ts-expect-error Unknown contract field.
	prismaUserFields(db.orm.adapter_test.User)({ missing: { type: "json" } });
	async function check() {
		const result = await auth.api.signUpEmail({
			body: {
				email: "a@b.com",
				name: "Ada",
				password: "password",
				profile: { name: "Ada", age: "36" },
			},
		});
		expectTypeOf(result.user.profile.age).toEqualTypeOf<number>();
		await auth.api.signUpEmail({
			body: {
				email: "a@b.com",
				name: "Ada",
				password: "password",
				// @ts-expect-error Codec input age is a string, even though the output is a number.
				profile: { name: "Ada", age: 36 },
			},
		});
		await auth.api.signUpEmail({
			// @ts-expect-error Required additional field is missing.
			body: { email: "a@b.com", name: "Ada", password: "password" },
		});
		await auth.api.updateUser({
			body: { profile: { name: "Ada", age: "37" } },
		});
		// @ts-expect-error Cannot set server-only fields.
		await auth.api.updateUser({ body: { secret: "x" } });
		const session = await auth.api.getSession({ headers: new Headers() });
		if (!session) throw new Error("Expected session");
		expectTypeOf(session.user.profile.age).toEqualTypeOf<number>();
		const headers = await auth.api.getSession({
			headers: new Headers(),
			returnHeaders: true,
		});
		if (!headers.response) throw new Error("Expected session");
		expectTypeOf(headers.response.user.profile.age).toEqualTypeOf<number>();
		const response = await auth.api.getSession({
			headers: new Headers(),
			asResponse: true,
		});
		expectTypeOf(response).toEqualTypeOf<Response>();
	}
	void check;

	expectTypeOf<typeof auth.$Infer.Session.user.lastSeen>().toEqualTypeOf<
		Date | null | undefined
	>();
});
