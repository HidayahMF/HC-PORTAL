export function ErrorMessage({ message }: { message: string }) { return <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-bmc-error">{message}</div> }
export function Spinner() { return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"/> }
