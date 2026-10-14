"use client";

import { useRef } from "react";
import Dialog from "@/components/ui/Dialog";
import { button } from "@/components/ui/Button";
import { answerConfirm, useConfirmRequest } from "@/lib/confirm";

// Shows confirmAction() requests. Focus starts on Cancel, so a stray Enter
// never deletes anything.
export default function ConfirmHost() {
  const request = useConfirmRequest();
  if (!request) return null;
  return <ConfirmDialog key={`${request.title}|${request.confirmLabel}`} request={request} />;
}

function ConfirmDialog({ request }) {
  const answer = useRef(false);
  return (
    <Dialog
      role="alertdialog"
      title={request.title}
      description={request.body || undefined}
      initialFocus="[data-cancel]"
      hideClose
      onClose={() => answerConfirm(request, answer.current)}
    >
      {(close) => (
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" data-cancel onClick={close} className={button({ variant: "neutral", size: "lg" })}>
            {request.cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              answer.current = true;
              close();
            }}
            className={button({ variant: request.tone === "danger" ? "danger" : "primary", size: "lg" })}
          >
            {request.confirmLabel}
          </button>
        </div>
      )}
    </Dialog>
  );
}
