import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy, Check, Upload, X, FileText, Image, Film, Archive, ArrowLeft,
  Zap, Lock, Wifi, WifiOff, Loader2, SendHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useWebRTC, FileTransferInfo } from "@/hooks/useWebRTC";
import { toast } from "@/hooks/use-toast";

const MAX_TOTAL_SIZE = 500 * 1024 * 1024 ; // 500MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return Image;
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return Film;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return Archive;
  return FileText;
}

const StatusBadge = ({ status }: { status: string }) => {
  const configs: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
    idle: { label: "Idle", icon: WifiOff, className: "bg-muted text-muted-foreground" },
    waiting: { label: "Waiting for receiver…", icon: Loader2, className: "bg-amber-100 text-amber-700 border-amber-200" },
    connected: { label: "Connected", icon: Wifi, className: "bg-success/10 text-success border-success/30" },
    transferring: { label: "Transferring…", icon: Loader2, className: "bg-transfer/10 text-transfer border-transfer/30" },
    done: { label: "Transfer complete!", icon: Check, className: "bg-success/10 text-success border-success/30" },
    error: { label: "Connection Lost", icon: WifiOff, className: "bg-destructive/10 text-destructive border-destructive/20" },
  };
  const cfg = configs[status] ?? configs.idle;
  const Icon = cfg.icon;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${cfg.className}`}>
      <Icon className={`w-3.5 h-3.5 ${status === "waiting" || status === "transferring" ? "animate-spin" : ""}`} />
      {cfg.label}
    </div>
  );
};

const SendRoom = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [fileInfos, setFileInfos] = useState<FileTransferInfo[]>([]);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [transferStarted, setTransferStarted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const shareUrl = `${window.location.origin}/receive/${roomCode}`;

  const handleProgress = useCallback((fileName: string, progress: number) => {
    setFileInfos((prev) => prev.map((f) => (f.name === fileName ? { ...f, progress } : f)));
  }, []);

  const { status, startSender, sendFiles } = useWebRTC({
    role: "sender",
    roomCode: roomCode ?? "",
    onProgress: handleProgress,
  });

  useEffect(() => {
    if (roomCode) {
      startSender();
    }
  }, [roomCode]);  // eslint-disable-line

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => {
      const merged = [...prev, ...incoming];
      const totalSize = merged.reduce((s, f) => s + f.size, 0);
      if (totalSize > MAX_TOTAL_SIZE) {
        toast({ title: "Size limit exceeded", description: "Total file size must be under 500MB.", variant: "destructive" });
        return prev;
      }
      const infos: FileTransferInfo[] = merged.map((f) => ({ name: f.name, size: f.size, type: f.type, progress: 0 }));
      setFileInfos(infos);
      return merged;
    });
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setFileInfos(next.map((f) => ({ name: f.name, size: f.size, type: f.type, progress: 0 })));
      return next;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(roomCode ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (files.length === 0) {
      toast({ title: "No files selected", description: "Add files to send first.", variant: "destructive" });
      return;
    }
    if (status !== "connected") {
      toast({ title: "Not connected", description: "Wait for the receiver to join.", variant: "destructive" });
      return;
    }
    setTransferStarted(true);
    await sendFiles(files);
  };

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Zap className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">RoomLink</span>
            </div>
          </button>
          <StatusBadge status={status} />
        </div>
      </header>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Room code + QR */}
          <div className="space-y-6">
            <Card className="shadow-card border-border/50 gradient-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Your Room Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="text-center">
                  <div className="inline-flex items-center gap-1 bg-primary/5 border border-primary/20 rounded-2xl px-6 py-4">
                    {(roomCode ?? "").split("").map((char, i) => (
                      <span key={i} className="text-4xl font-black tracking-widest text-primary font-mono">{char}</span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCopy} variant="outline" className="flex-1 gap-2">
                    {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy Code"}
                  </Button>
                  <Button
                    onClick={() => { navigator.clipboard.writeText(shareUrl); toast({ title: "Link copied!" }); }}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </Button>
                </div>

                <div className="flex flex-col items-center gap-3 pt-2">
                  <p className="text-xs text-muted-foreground font-medium">Scan to receive</p>
                  <div className="p-3 bg-card rounded-xl shadow-card">
                    <QRCodeSVG value={shareUrl} size={160} level="M" />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>This room expires in 10 minutes. Share the code or scan the QR with the receiver.</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: File drop + send */}
          <div className="space-y-6">
            <Card className="shadow-card border-border/50 gradient-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" />
                  Files to Send
                  {files.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {files.length} file{files.length > 1 ? "s" : ""} · {formatSize(totalSize)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drop zone */}
                {!transferStarted && (
                  <div
                    onDragEnter={() => setIsDragging(true)}
                    onDragLeave={() => setIsDragging(false)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                      isDragging
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    <Upload className={`w-8 h-8 mx-auto mb-3 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-sm font-medium text-foreground">Drop files here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">Up to 500MB total · Any file type</p>
                    <input
                      ref={inputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
                    />
                  </div>
                )}

                {/* File list */}
                {fileInfos.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {fileInfos.map((file, i) => {
                      const Icon = getFileIcon(file.name);
                      return (
                        <div key={`${file.name}-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/40">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                            {file.progress > 0 && (
                              <Progress value={file.progress} className="h-1.5 mt-1.5" />
                            )}
                          </div>
                          {!transferStarted && (
                            <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          {file.progress === 100 && <Check className="w-4 h-4 text-success shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Send button */}
                <Button
                  onClick={handleSend}
                  disabled={files.length === 0 || status !== "connected" || transferStarted}
                  className="w-full gap-2 h-11"
                  size="lg"
                >
                  {status === "transferring" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : status === "done" ? (
                    <><Check className="w-4 h-4" /> Sent!</>
                  ) : status === "waiting" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Waiting for receiver…</>
                  ) : (
                    <><SendHorizontal className="w-4 h-4" /> Send Files</>
                    
                  ) }
                </Button>

                {status === "waiting" && (
                  <p className="text-center text-xs text-muted-foreground">
                    Share the room code above. Transfer starts automatically when the receiver joins.
                  </p>
                )}
                {status === "done" && (
                  <div className="text-center p-4 bg-success/5 rounded-lg border border-success/30">
                    <Check className="w-6 h-6 text-success mx-auto mb-1" />
                    <p className="text-sm font-medium text-success">All files transferred successfully!</p>
                  </div>
                )}
              </CardContent>
              
            
            </Card>
            
          </div>
          
          
        </div>
      </div>
    </div>
  );
};

export default SendRoom;
