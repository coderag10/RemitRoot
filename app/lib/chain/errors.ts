// Turns a failed request or transaction into a text key that says what happened and what to do.
import { isTextKey, type TextKey } from "../i18n";
import idl from "./remitroot.json";

export function errorKey(error: unknown): TextKey {
  const message = error instanceof Error ? error.message : String(error);
  if (isTextKey(message)) return message;
  const logs = (error as { logs?: string[]; transactionLogs?: string[] } | null);
  const text = `${message}\n${(logs?.logs ?? logs?.transactionLogs ?? []).join("\n")}`;

  if (/user rejected|rejected the request|request was cancell?ed|declined/i.test(text)) return "error.rejected";

  const programError = idl.errors.find(
    ({ code, name }) =>
      text.includes(`Error Code: ${name}`) ||
      text.includes(`custom program error: 0x${code.toString(16)}`) ||
      text.includes(`"Custom":${code}`),
  );
  if (programError) {
    const key = `error.${programError.name}`;
    return isTextKey(key) ? key : "error.busy";
  }
  if (/insufficient lamports|insufficient funds for (fee|rent)|no record of a prior credit|AccountNotFound/i.test(text)) {
    return "error.noSol";
  }
  if (/block height exceeded|has expired|was not confirmed in/i.test(text)) return "error.expired";
  return "error.busy";
}
