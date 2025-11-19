import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMessages, useMessageMutations } from "@/hooks/useMessages";
import { useToast } from "@/hooks/use-toast";

interface MessageThreadProps {
    conversationId: string;
    conversationTitle: string;
}

export const MessageThread = ({ conversationId, conversationTitle }: MessageThreadProps) => {
    const { data: messages = [], isLoading } = useMessages(conversationId);
    const { sendMessage } = useMessageMutations(conversationId);
    const [newMessage, setNewMessage] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const handleSend = () => {
        if (!newMessage.trim()) return;

        sendMessage.mutate(newMessage.trim(), {
            onSuccess: () => {
                setNewMessage("");
                toast({ title: "Message sent" });
            },
            onError: () => {
                toast({ title: "Failed to send message", variant: "destructive" });
            },
        });
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Card className="flex flex-col h-[calc(100vh-12rem)]">
            <CardHeader className="pb-3 border-b">
                <CardTitle>{conversationTitle}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                    <div ref={scrollRef} className="space-y-4">
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No messages yet. Start the conversation!
                            </div>
                        ) : (
                            messages.map((message) => {
                                const isOwn = message.sender_id === "current";
                                return (
                                    <div
                                        key={message.id}
                                        className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                                    >
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarFallback className="text-xs">
                                                {message.sender?.full_name ? getInitials(message.sender.full_name) : "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className={`flex flex-col gap-1 max-w-[70%] ${isOwn ? "items-end" : ""}`}>
                                            <div
                                                className={`rounded-lg px-4 py-2 ${isOwn
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted"
                                                    }`}
                                            >
                                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground px-2">
                                                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t">
                    <div className="flex gap-2">
                        <Textarea
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            className="min-h-[80px] resize-none"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!newMessage.trim() || sendMessage.isPending}
                            size="icon"
                            className="shrink-0"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
