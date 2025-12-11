import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface VoiceMessagePlayerProps {
  audioPath: string;
  duration: number;
  isOwnMessage: boolean;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const VoiceMessagePlayer = ({ 
  audioPath, 
  duration, 
  isOwnMessage 
}: VoiceMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <audio
        ref={audioRef}
        src={audioPath}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 rounded-full shrink-0 ${
          isOwnMessage 
            ? "hover:bg-primary-foreground/20" 
            : "hover:bg-accent"
        }`}
        onClick={handlePlayPause}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>

      <div 
        ref={progressRef}
        className="flex-1 h-2 bg-background/30 rounded-full cursor-pointer overflow-hidden"
        onClick={handleProgressClick}
      >
        <div 
          className={`h-full transition-all ${
            isOwnMessage 
              ? "bg-primary-foreground/70" 
              : "bg-primary"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={cyclePlaybackRate}
          className={`text-xs px-1.5 py-0.5 rounded hover:bg-background/20 ${
            isOwnMessage 
              ? "text-primary-foreground/70" 
              : "text-muted-foreground"
          }`}
        >
          {playbackRate}x
        </button>
        <span className={`text-xs tabular-nums ${
          isOwnMessage 
            ? "text-primary-foreground/70" 
            : "text-muted-foreground"
        }`}>
          {formatDuration(currentTime || 0)} / {formatDuration(duration)}
        </span>
      </div>
    </div>
  );
};
