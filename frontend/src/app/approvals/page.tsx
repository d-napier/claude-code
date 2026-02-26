import { ApprovalList } from "@/components/approvals/approval-list";

export default function ApprovalsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approval Queue</h1>
        <p className="text-sm text-muted-foreground">
          Review and respond to high-risk tool call requests from agents.
          Approvals expire automatically if not acted on.
        </p>
      </div>
      <ApprovalList />
    </div>
  );
}
