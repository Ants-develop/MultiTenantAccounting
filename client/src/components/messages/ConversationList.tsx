import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Conversation } from "@/types/messages";

interface ConversationListProps {
    conversations: Conversation[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export const ConversationList = ({ conversations, selectedId, onSelect }: ConversationListProps) => {
    const getConversationTitle = (conv: Conversation) => {
        if (conv.title) return conv.title;
        if (conv.client) return conv.client.name;
        if (conv.participants && conv.participants.length > 0) {
            return conv.participants.map(p => p.full_name).join(", ");
        }
        return "Conversation";
    };

    const getIcon = (type: string) => {
        return type === "group" ? <Users className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />;
    };

    return (
        <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-2 pr-4">
                {conversations.length === 0 ? (
                    <Card className="p-8 text-center">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No conversations yet</p>
                    </Card>
                ) : (
                    conversations.map((conv) => (
                        <Card
                            key={conv.id}
                            className={`p-4 cursor-pointer hover:bg-accent transition-colors ${selectedId === conv.id ? "bg-accent border-primary" : ""
                                }`}
                            onClick={() => onSelect(conv.id)}
                        >
                            <div className="flex items-start gap-3">
                                <Avatar>
                                    <AvatarFallback>
                                        {getIcon(conv.type)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className="font-medium text-sm truncate">
                                            {getConversationTitle(conv)}
                                        </h4>
                                        {conv.unread_count && conv.unread_count > 0 && (
                                            <Badge variant="default" className="shrink-0">
                                                {conv.unread_count}
                                            </Badge>
                                        )}
                                    </div>
                                    {conv.last_message_at && (
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </ScrollArea>
    );
};
