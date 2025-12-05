export const formatAudioDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error("Microphone permission denied:", error);
    return false;
  }
};

export const uploadVoiceMessage = async (
  blob: Blob,
  conversationId: number,
  userId: number
): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append("audio", blob, `voice-${Date.now()}.webm`);
    formData.append("conversationId", conversationId.toString());
    
    const response = await fetch("/api/messages/voice-upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    return data.path;
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
};

export const getVoiceMessageUrl = (path: string): string => {
  // Voice messages are served from the storage API
  return `/api/storage/voice-messages/${path}`;
};

