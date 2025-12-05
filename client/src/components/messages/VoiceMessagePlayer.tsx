import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { formatAudioDuration, getVoiceMessageUrl } from "@/utils/audioUtils";
import { Skeleton } from "@/components/ui/skeleton";

interface VoiceMessagePlayerProps {
  audioPath: string;
  duration: number;
  isOwnMessage: boolean;
}

export const VoiceMessagePlayer = ({ audioPath, duration, isOwnMessage }: VoiceMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadAudio = () => {
      setIsLoading(true);
      const url = getVoiceMessageUrl(audioPath);
      setAudioUrl(url);
      setIsLoading(false);
    };
    loadAudio();
  }, [audioPath]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 min-w-[200px]">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-2 flex-1 rounded-full" />
        <Skeleton className="h-4 w-12" />
      </div>
    );
  }

  if (!audioUrl) {
    return (
      <div className={`flex items-center gap-2 min-w-[200px] ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
        <div className="h-8 w-8 rounded-full bg-background/20 flex items-center justify-center shrink-0">
          <Play className="h-4 w-4 opacity-50" />
        </div>
        <span className="text-sm">Voice message unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        hidden
      />

      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 shrink-0 ${isOwnMessage ? "hover:bg-primary-foreground/20" : ""}`}
        onClick={handlePlayPause}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div
        ref={progressRef}
        className="flex-1 h-2 bg-background/50 rounded-full cursor-pointer overflow-hidden"
        onClick={handleProgressClick}
      >
        <div
          className={`h-full rounded-full transition-all ${
            isOwnMessage ? "bg-primary-foreground" : "bg-primary"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className={`text-xs whitespace-nowrap ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
        {formatAudioDuration(currentTime)} / {formatAudioDuration(duration)}
      </span>

      <Button
        variant="ghost"
        size="sm"
        className={`h-6 px-1 text-xs ${isOwnMessage ? "hover:bg-primary-foreground/20" : ""}`}
        onClick={cyclePlaybackRate}
      >
        {playbackRate}x
      </Button>
    </div>
  );
};


