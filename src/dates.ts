import { Temporal } from "temporal-polyfill";

/** Only adapt built-in PostgreSQL temporal codecs on Better Auth `date` fields. */
export function dateInput(codec: string | undefined, value: unknown): unknown {
	if (Array.isArray(value)) return value.map((item) => dateInput(codec, item));
	if (!(value instanceof Date)) return value;
	switch (codec) {
		case "pg/timestamptz-temporal@1":
			return Temporal.Instant.fromEpochMilliseconds(value.getTime());
		case "pg/timestamp-temporal@1":
			return Temporal.Instant.fromEpochMilliseconds(value.getTime())
				.toZonedDateTimeISO("UTC")
				.toPlainDateTime();
		case "pg/date-temporal@1":
			return Temporal.Instant.fromEpochMilliseconds(value.getTime())
				.toZonedDateTimeISO("UTC")
				.toPlainDate();
		case "pg/timestamptz-string@1":
			return value.toISOString();
		case "pg/timestamp-string@1":
			return value.toISOString().slice(0, -1);
		case "pg/date-string@1":
			return value.toISOString().slice(0, 10);
		default:
			return value;
	}
}

export function dateOutput(codec: string | undefined, value: unknown): unknown {
	if (value == null) return value;
	switch (codec) {
		case "pg/timestamptz-temporal@1":
		case "pg/timestamptz-string@1":
			return new Date(String(value));
		case "pg/timestamp-temporal@1":
		case "pg/timestamp-string@1":
			return new Date(`${String(value).replace(" ", "T")}Z`);
		case "pg/date-temporal@1":
		case "pg/date-string@1":
			return new Date(`${String(value)}T00:00:00Z`);
		default:
			return value;
	}
}
