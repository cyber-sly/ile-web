"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Alert from "@/components/ui/Alert";

function Notice() {
  const params = useSearchParams();
  if (params.get("account") !== "deleted") return null;
  return (
    <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-6">
      <Alert tone="success">Your account has been deleted. Thanks for using Ile.</Alert>
    </div>
  );
}

// Shown on the homepage right after someone deletes their account.
export default function AccountDeletedNotice() {
  return (
    <Suspense>
      <Notice />
    </Suspense>
  );
}
