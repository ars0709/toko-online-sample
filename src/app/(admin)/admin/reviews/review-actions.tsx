"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { moderateReview } from "@/server/actions/admin";

export function ReviewActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(to: "PUBLISHED" | "REJECTED") {
    setError(null);
    startTransition(async () => {
      const res = await moderateReview(id, to);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => run("PUBLISHED")}
          disabled={pending || status === "PUBLISHED"}
        >
          <Check className="size-3.5" /> Setujui
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => run("REJECTED")}
          disabled={pending || status === "REJECTED"}
        >
          <X className="size-3.5" /> Tolak
        </Button>
      </div>
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
