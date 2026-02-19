import { useState, useRef, useCallback, useEffect } from "react";
import { socket } from "@/socket";
import { toast } from "@/hooks/use-toast";

const CHUNK_SIZE = 64 * 1024;
const MAX_BUFFERED_AMOUNT = 16 * 1024 * 1024;

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export type TransferStatus =
  | "idle"
  | "waiting"
  | "connected"
  | "transferring"
  | "done"
  | "error";

export interface FileTransferInfo {
  name: string;
  size: number;
  type: string;
  progress: number;
}

interface UseWebRTCOptions {
  role: "sender" | "receiver";
  roomCode: string;
  onFilesReceived?: (files: FileTransferInfo[]) => void;
  onProgress?: (fileName: string, progress: number) => void;
  onTransferComplete?: () => void;
}

export function useWebRTC({
  role,
  roomCode,
  onFilesReceived,
  onProgress,
  onTransferComplete,
}: UseWebRTCOptions) {
  const [status, setStatus] = useState<TransferStatus>("idle");
  const [fileInfos, setFileInfos] = useState<FileTransferInfo[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);

  const receiveBufferRef = useRef<
    Record<
      string,
      { chunks: ArrayBuffer[]; received: number; total: number; type: string }
    >
  >({});
  const currentFileRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    channelRef.current?.close();
    pcRef.current?.close();
    channelRef.current = null;
    pcRef.current = null;

    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");
    socket.off("user-joined");
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const setupPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setStatus("connected");
        toast({ title: "🔒 Peer connected" });
      }
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected"
      ) {
        setStatus("error");
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate);
      }
    };

    return pc;
  }, []);

  // ───────────── SENDER ─────────────
  const startSender = useCallback(async () => {
    setStatus("waiting");

    const pc = setupPeerConnection();

    const channel = pc.createDataChannel("files");
    channelRef.current = channel;

    channel.onopen = () => setStatus("connected");

    socket.emit("join-room", { roomId: roomCode });

    socket.on("user-joined", async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", offer);
    });

    socket.on("answer", async (answer) => {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    });
  }, [roomCode, setupPeerConnection]);

  // ───────────── RECEIVER ─────────────
  const startReceiver = useCallback(async () => {
    setStatus("waiting");

    const pc = setupPeerConnection();

    socket.emit("join-room", { roomId: roomCode });

    socket.on("offer", async (offer) => {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", answer);
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    });

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      channelRef.current = channel;

      channel.onopen = () => setStatus("connected");
      channel.binaryType = "arraybuffer";

      channel.onmessage = (e) => {
        const data = e.data;

        if (typeof data === "string") {
          const msg = JSON.parse(data);

          if (msg.type === "file-list") {
            const infos = msg.files.map((f: any) => ({
              ...f,
              progress: 0,
            }));
            setFileInfos(infos);
            onFilesReceived?.(infos);
          } else if (msg.type === "file-start") {
            currentFileRef.current = msg.name;
            receiveBufferRef.current[msg.name] = {
              chunks: [],
              received: 0,
              total: msg.size,
              type: msg.fileType,
            };
          } else if (msg.type === "file-end") {
            const fileData = receiveBufferRef.current[msg.name];
            const blob = new Blob(fileData.chunks, {
              type: fileData.type,
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = msg.name;
            a.click();
            URL.revokeObjectURL(url);

            onProgress?.(msg.name, 100);
          } else if (msg.type === "transfer-complete") {
            setStatus("done");
            onTransferComplete?.();
          }
        } else {
          const fileName = currentFileRef.current;
          if (!fileName) return;

          const fileData = receiveBufferRef.current[fileName];
          fileData.chunks.push(data);
          fileData.received += data.byteLength;

          const progress = Math.round(
            (fileData.received / fileData.total) * 100
          );

          onProgress?.(fileName, progress);
        }
      };
    };
  }, [roomCode, setupPeerConnection, onFilesReceived, onProgress, onTransferComplete]);

  // ───────────── SEND FILES ─────────────
  const sendFiles = useCallback(
    async (files: File[]) => {
      const channel = channelRef.current;
      if (!channel || channel.readyState !== "open") {
        toast({ title: "Not connected", variant: "destructive" });
        return;
      }

      setStatus("transferring");

      const fileList = files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      }));

      channel.send(JSON.stringify({ type: "file-list", files: fileList }));

      for (const file of files) {
        channel.send(
          JSON.stringify({
            type: "file-start",
            name: file.name,
            size: file.size,
            fileType: file.type,
          })
        );

        let offset = 0;
        while (offset < file.size) {
          while (channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
            await new Promise((r) => setTimeout(r, 50));
          }

          const slice = file.slice(offset, offset + CHUNK_SIZE);
          const buffer = await slice.arrayBuffer();
          channel.send(buffer);
          offset += buffer.byteLength;

          const progress = Math.round((offset / file.size) * 100);
          onProgress?.(file.name, progress);
        }

        channel.send(JSON.stringify({ type: "file-end", name: file.name }));
      }

      channel.send(JSON.stringify({ type: "transfer-complete" }));
      setStatus("done");
    },
    [onProgress]
  );

  return {
    status,
    fileInfos,
    setFileInfos,
    startSender,
    startReceiver,
    sendFiles,
    cleanup,
  };
}
