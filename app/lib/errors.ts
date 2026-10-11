import idl from "./idl/remitroot.json";
import { hasText, t } from "./i18n";

/** Turns a failed transaction or request into words that say what happened and what to do. */
export function errorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const logs = (error as { logs?: string[] } | null)?.logs?.join("\n") ?? "";
  const text = `${message}\n${logs}`;

  if (/user rejected|rejected the request|cancell?ed/i.test(text)) return t("error.rejected");

  const programError = idl.errors.find(
    ({ code, name }) =>
      text.includes(`Error Code: ${name}`) || text.includes(`custom program error: 0x${code.toString(16)}`),
  );
  if (programError) {
    const key = `error.${programError.name}`;
    return hasText(key) ? t(key) : programError.msg;
  }

  if (/insufficient lamports|insufficient funds for (fee|rent)|no record of a prior credit/i.test(text)) {
    return t("error.noSol");
  }
  if (hasText(message)) return t(message);
  return t("error.busy");
}
