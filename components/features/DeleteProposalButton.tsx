"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";

interface DeleteProposalButtonProps {
  proposalId: string;
}

export default function DeleteProposalButton({ proposalId }: DeleteProposalButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      toast.success("Proposal deleted.");
      router.push("/profile");
      router.refresh();
    } catch {
      toast.error("We couldn't delete this proposal. Please try again.");
      setLoading(false);
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
        Delete proposal
      </Button>
    );
  }

  return (
    <div role="alertdialog" aria-label="Confirm delete" className="rounded-xl border border-nay/30 bg-nay/[0.06] p-3">
      <p className="text-sm text-ink">Delete this proposal? Its upvotes and comments will be removed too.</p>
      <div className="mt-3 flex gap-2">
        <Button variant="danger" size="sm" loading={loading} onClick={handleDelete} autoFocus>
          Yes, delete it
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
