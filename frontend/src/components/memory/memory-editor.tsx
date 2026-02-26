"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { FileText, Save, RotateCcw, AlertTriangle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// --- Types ---

interface MemoryFile {
  path: string;
  group: string; // "global" or group folder name
  name: string;
  lastModified?: string;
  etag?: string;
}

interface FileContent {
  content: string;
  etag: string;
  lastModified: string;
}

// --- API helpers ---

async function fetchMemoryFiles(): Promise<MemoryFile[]> {
  try {
    const res = await fetch("/api/memory/files");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    // Return demo data when API is unavailable
    return [
      { path: "global/CLAUDE.md", group: "global", name: "CLAUDE.md", lastModified: new Date().toISOString(), etag: "demo-global" },
      { path: "main/CLAUDE.md", group: "main", name: "CLAUDE.md", lastModified: new Date().toISOString(), etag: "demo-main" },
      { path: "team-alpha/CLAUDE.md", group: "team-alpha", name: "CLAUDE.md", lastModified: new Date().toISOString(), etag: "demo-alpha" },
      { path: "research/CLAUDE.md", group: "research", name: "CLAUDE.md", lastModified: new Date().toISOString(), etag: "demo-research" },
    ];
  }
}

async function fetchFileContent(filePath: string): Promise<FileContent> {
  try {
    const res = await fetch(`/api/memory/files/${encodeURIComponent(filePath)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      content: data.content,
      etag: res.headers.get("etag") ?? data.etag ?? "",
      lastModified: data.lastModified ?? new Date().toISOString(),
    };
  } catch {
    // Return demo content when API is unavailable
    const demoContent = getDemoContent(filePath);
    return {
      content: demoContent,
      etag: `demo-${Date.now()}`,
      lastModified: new Date().toISOString(),
    };
  }
}

function getDemoContent(filePath: string): string {
  if (filePath.startsWith("global")) {
    return `# Global Agent Memory

## Identity
You are Andy, a helpful AI assistant managing multiple agent groups.

## General Rules
- Prefer concise responses
- Use bullet points for lists
- Always verify before destructive operations

## Known Facts
- Production server: 10.0.1.5
- Deploy branch: main
- CI pipeline: GitHub Actions
`;
  }
  const group = filePath.split("/")[0];
  return `# ${group} Agent Memory

## Group-Specific Context
This is the memory file for the ${group} agent group.

## Preferences
- Add group-specific preferences here

## Notes
- Add group-specific notes here
`;
}

async function saveFileContent(
  filePath: string,
  content: string,
  etag: string
): Promise<{ ok: boolean; conflict?: boolean; newEtag?: string; serverContent?: string }> {
  try {
    const res = await fetch(`/api/memory/files/${encodeURIComponent(filePath)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "If-Match": etag,
      },
      body: JSON.stringify({ content }),
    });

    if (res.status === 412) {
      // Conflict: file was modified since we loaded it
      const data = await res.json();
      return { ok: false, conflict: true, serverContent: data.content };
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return {
      ok: true,
      newEtag: res.headers.get("etag") ?? data.etag ?? "",
    };
  } catch (err) {
    // In demo mode, simulate a successful save
    if (etag.startsWith("demo-")) {
      return { ok: true, newEtag: `demo-${Date.now()}` };
    }
    return { ok: false };
  }
}

// --- Component ---

export function MemoryEditor() {
  // File list state
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  // Selected file state
  const [selectedFile, setSelectedFile] = useState<MemoryFile | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [currentEtag, setCurrentEtag] = useState("");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // Conflict dialog
  const [conflictOpen, setConflictOpen] = useState(false);
  const [serverContent, setServerContent] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = content !== originalContent;

  // Load file list on mount
  useEffect(() => {
    fetchMemoryFiles().then((f) => {
      setFiles(f);
      setLoadingFiles(false);
    });
  }, []);

  // Load file content when selected
  const loadFile = useCallback(async (file: MemoryFile) => {
    setSelectedFile(file);
    setLoadingContent(true);
    setSaveStatus("idle");

    const result = await fetchFileContent(file.path);
    setContent(result.content);
    setOriginalContent(result.content);
    setCurrentEtag(result.etag);
    setLastSaved(result.lastModified);
    setLoadingContent(false);

    // Focus textarea after load
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  // Save handler with conflict detection
  const handleSave = useCallback(async () => {
    if (!selectedFile || !isDirty) return;

    setSaving(true);
    setSaveStatus("idle");

    const result = await saveFileContent(selectedFile.path, content, currentEtag);

    if (result.ok) {
      setOriginalContent(content);
      setCurrentEtag(result.newEtag ?? currentEtag);
      setLastSaved(new Date().toISOString());
      setSaveStatus("saved");
      // Clear the "saved" indicator after 3s
      setTimeout(() => setSaveStatus("idle"), 3000);
    } else if (result.conflict) {
      // Show conflict resolution dialog
      setServerContent(result.serverContent ?? "");
      setConflictOpen(true);
    } else {
      setSaveStatus("error");
    }

    setSaving(false);
  }, [selectedFile, content, currentEtag, isDirty]);

  // Revert handler
  const handleRevert = useCallback(() => {
    setContent(originalContent);
    setSaveStatus("idle");
  }, [originalContent]);

  // Force overwrite on conflict
  const handleForceOverwrite = useCallback(async () => {
    if (!selectedFile) return;
    setConflictOpen(false);
    setSaving(true);

    // Re-fetch to get new etag, then save again
    const fresh = await fetchFileContent(selectedFile.path);
    const result = await saveFileContent(selectedFile.path, content, fresh.etag);

    if (result.ok) {
      setOriginalContent(content);
      setCurrentEtag(result.newEtag ?? fresh.etag);
      setLastSaved(new Date().toISOString());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } else {
      setSaveStatus("error");
    }

    setSaving(false);
  }, [selectedFile, content]);

  // Accept server version on conflict
  const handleAcceptServer = useCallback(() => {
    setContent(serverContent);
    setOriginalContent(serverContent);
    setConflictOpen(false);
    setSaveStatus("idle");
  }, [serverContent]);

  // Keyboard shortcut for save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  // Group files by group folder
  const grouped = files.reduce<Record<string, MemoryFile[]>>((acc, file) => {
    const key = file.group;
    if (!acc[key]) acc[key] = [];
    acc[key].push(file);
    return acc;
  }, {});

  // Sort: global first, then alphabetically
  const groupOrder = Object.keys(grouped).sort((a, b) => {
    if (a === "global") return -1;
    if (b === "global") return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="flex h-full gap-4">
      {/* File tree sidebar */}
      <Card className="w-64 shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Memory Files</CardTitle>
        </CardHeader>
        <Separator />
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="p-3 space-y-3">
            {loadingFiles ? (
              <p className="text-sm text-muted-foreground px-2">Loading...</p>
            ) : groupOrder.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2">No memory files found.</p>
            ) : (
              groupOrder.map((group) => (
                <div key={group}>
                  <div className="flex items-center gap-1.5 px-2 py-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group === "global" ? "Global" : group}
                    </span>
                    {group === "global" && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        shared
                      </Badge>
                    )}
                  </div>
                  {grouped[group].map((file) => (
                    <button
                      key={file.path}
                      onClick={() => loadFile(file)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                        selectedFile?.path === file.path
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Editor panel */}
      <div className="flex flex-1 flex-col gap-3">
        {selectedFile ? (
          <>
            {/* Editor header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium">{selectedFile.path}</h2>
                {isDirty && (
                  <Badge variant="secondary" className="text-xs">
                    Unsaved changes
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3" /> Save failed
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevert}
                  disabled={!isDirty || saving}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Revert
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            {/* Textarea editor */}
            <Card className="flex-1">
              <CardContent className="h-full p-0">
                {loadingContent ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-muted-foreground">Loading file...</p>
                  </div>
                ) : (
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="h-full w-full resize-none border-0 bg-transparent p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-0"
                    placeholder="Enter memory content..."
                    spellCheck={false}
                  />
                )}
              </CardContent>
            </Card>

            {/* Status bar */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  {content.split("\n").length} lines | {content.length} chars
                </span>
                <span>Markdown</span>
                <span>UTF-8</span>
              </div>
              {lastSaved && (
                <span>
                  Last saved:{" "}
                  {new Date(lastSaved).toLocaleTimeString()}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Select a memory file to edit
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                CLAUDE.md files define agent context and behavior
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Conflict resolution dialog */}
      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Save Conflict Detected
            </DialogTitle>
            <DialogDescription>
              The file was modified since you last loaded it. Choose how to resolve
              the conflict.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="mb-2 text-sm font-medium">Your Version</h4>
              <pre className="max-h-60 overflow-auto rounded-md bg-muted p-3 text-xs">
                {content}
              </pre>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium">Server Version</h4>
              <pre className="max-h-60 overflow-auto rounded-md bg-muted p-3 text-xs">
                {serverContent}
              </pre>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleAcceptServer}>
              Use Server Version
            </Button>
            <Button variant="destructive" onClick={handleForceOverwrite}>
              Overwrite with Mine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
