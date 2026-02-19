import { useNavigate } from "react-router-dom";
import {
  Shield,
  Zap,
  Lock,
  Upload,
  Download,
  ArrowRight,
  Globe,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const features = [
  {
    icon: Lock,
    label: "E2E Encrypted",
    desc: "WebRTC DTLS — nobody can intercept your files",
  },
  {
    icon: Globe,
    label: "Works Anywhere",
    desc: "Cross-network — no local WiFi required",
  },
  {
    icon: CheckCircle,
    label: "Zero Storage",
    desc: "Files never touch our servers",
  },
];

const steps = [
  {
    num: "01",
    icon: Upload,
    title: "Create a Room",
    desc: "Click Send Files. A secure room ID is instantly generated.",
  },
  {
    num: "02",
    icon: ArrowRight,
    title: "Share the Link",
    desc: "Send the room link to your receiver.",
  },
  {
    num: "03",
    icon: Download,
    title: "Direct Transfer",
    desc: "Files transfer encrypted, peer-to-peer.",
  },
];

const Index = () => {
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    try {
      const res = await fetch("https://justpost-151e.onrender.com/api/create-room", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to create room");
      }

      const data = await res.json();

      // Navigate to sender page
      navigate(`/send/${data.roomId}`);
    } catch (err: any) {
      toast({
        title: "Error creating room",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">
              justPost
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-3.5 h-3.5" />
            <span>End-to-End Encrypted</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="gradient-hero text-white relative overflow-hidden">
        <div className="container max-w-6xl mx-auto px-4 py-20 md:py-28 relative text-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
            Transfer files
            <span className="block text-accent">peer-to-peer.</span>
            <span className="block">Securely.</span>
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/70 mb-10 max-w-xl mx-auto">
            Share a room link. Connect instantly. Files go directly between devices —
            encrypted, no storage.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleCreateRoom}
              className="group flex items-center justify-center gap-3 bg-card text-primary font-semibold px-8 py-4 rounded-xl text-base shadow-elevated hover:scale-[1.02] transition"
            >
              <Upload className="w-5 h-5" />
              Send Files
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate("/receive")}
              className="group flex items-center justify-center gap-3 bg-white/10 backdrop-blur border border-white/25 text-white font-semibold px-8 py-4 rounded-xl text-base hover:bg-white/15 transition"
            >
              <Download className="w-5 h-5" />
              Receive Files
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            How it works
          </h2>
          <p className="text-muted-foreground">
            Three simple steps to transfer securely
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <Card
              key={step.num}
              className="shadow-card border-border/50"
            >
              <CardContent className="p-7">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="container max-w-6xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        <p>RoomLink · P2P encrypted file transfers · No accounts required</p>
      </footer>
    </div>
  );
};

export default Index;
