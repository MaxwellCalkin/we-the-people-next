import { Loader2 } from "lucide-react";

export default function AuthLoading() {
  return (
    <div className="flex flex-1 items-center justify-center" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
