import { MemoryEditor } from "@/components/memory/memory-editor";

export default function MemoryPage() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Memory Editor</h1>
        <p className="text-sm text-muted-foreground">
          Edit CLAUDE.md memory files that define agent context and behavior.
          Changes are applied on the next agent session.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <MemoryEditor />
      </div>
    </div>
  );
}
