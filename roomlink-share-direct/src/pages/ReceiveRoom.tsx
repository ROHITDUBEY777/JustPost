import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Zap,
  Lock,
  Download,
  Loader2,
  Check,
  FileText,
  Image,
  Film,
  Archive,
  WifiOff,
  Wifi,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useWebRTC, FileTransferInfo, TransferStatus } from "@/hooks/useWebRTC";
import { toast } from "@/hooks/use-toast";

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

const StatusBadge = ({ status }: { status: TransferStatus }) => {
  const configs: Record<string, { label: string; icon: any; className: string }> = {
    idle: { label: "Enter a room to start", icon: WifiOff, className: "bg-muted text-muted-foreground" },
    waiting: { label: "Connecting…", icon: Loader2, className: "bg-amber-100 text-amber-700 border-amber-200" },
    connected: { label: "Connected", icon: Wifi, className: "bg-success/10 text-success border-success/30" },
    transferring: { label: "Receiving files…", icon: Loader2, className: "bg-transfer/10 text-transfer border-transfer/30" },
    done: { label: "All files received!", icon: Check, className: "bg-success/10 text-success border-success/30" },
    error: { label: "Connection error", icon: AlertCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
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

const ReceiveRoom = () => {
  const { roomCode: paramCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  const [inputCode, setInputCode] = useState(paramCode?.toUpperCase() ?? "");
  const [activeCode, setActiveCode] = useState<string | null>(paramCode ?? null);
  const [fileInfos, setFileInfos] = useState<FileTransferInfo[]>([]);
  const [hasJoined, setHasJoined] = useState(!!paramCode);

  const handleFilesReceived = useCallback((files: FileTransferInfo[]) => {
    setFileInfos(files);
  }, []);

  const handleProgress = useCallback((fileName: string, progress: number) => {
    setFileInfos((prev) =>
      prev.map((f) => (f.name === fileName ? { ...f, progress } : f))
    );
  }, []);

  const { status, startReceiver } = useWebRTC({
    role: "receiver",
    roomCode: activeCode ?? "",
    onFilesReceived: handleFilesReceived,
    onProgress: handleProgress,
  });

  useEffect(() => {
    if (activeCode && hasJoined) {
      startReceiver();
    }
  }, [activeCode, hasJoined]); // eslint-disable-line

  const handleJoin = () => {
    const code = inputCode.trim();

    if (!code) {
      toast({
        title: "Invalid room",
        description: "Enter a valid room link or code.",
        variant: "destructive",
      });
      return;
    }

    setActiveCode(code);
    setHasJoined(true);
    navigate(`/receive/${code}`, { replace: true });
  };

  const allDone =
    fileInfos.length > 0 && fileInfos.every((f) => f.progress === 100);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-bold">RoomLink</span>
          </button>
          <StatusBadge status={status} />
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 py-12">
        {!hasJoined ? (
          <Card className="shadow-card border-border/50">
            <CardHeader className="text-center">
              <CardTitle>Receive Files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 flex flex-col items-center">
              <InputOTP
                maxLength={36}
                value={inputCode}
                onChange={(v) => setInputCode(v)}
                onComplete={handleJoin}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>

              <Button onClick={handleJoin} className="w-full">
                Join Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="shadow-card border-border/50">
              <CardHeader>
                <CardTitle>
                  Room <span className="font-mono">{activeCode}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {status === "waiting" && (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p>Connecting to sender…</p>
                  </div>
                )}

                {fileInfos.map((file, i) => {
                  const Icon = getFileIcon(file.name);
                  return (
                    <div key={i} className="mb-4">
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{file.name}</span>
                      </div>
                      <Progress value={file.progress} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {(status === "done" || allDone) && (
              <Button onClick={() => navigate("/")}>Back to Home</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiveRoom;
