import { FeedPost } from '@/types/feed';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';

export function PostCard({ post }: { post: FeedPost }) {
    const authorName = post.author?.full_name || 'Unknown Author';
    const initials = authorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <Card className="mb-4 shadow-sm border-gray-200 hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between gap-4 p-4 pb-2 space-y-0">
                <div className="flex flex-row items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={post.author?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-semibold text-sm text-gray-900">{authorName}</div>
                        <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            {post.author?.job_title && ` • ${post.author.job_title}`}
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <div 
                    className="prose prose-sm max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ __html: post.content }} 
                />
            </CardContent>
            <CardFooter className="p-2 border-t bg-gray-50/30 flex justify-between">
                <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-red-500 hover:bg-red-50 gap-2">
                        <Heart className="h-4 w-4" />
                        <span className="text-xs font-medium">Like</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 gap-2">
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">Comment</span>
                    </Button>
                </div>
                {/* <Button variant="ghost" size="sm" className="text-gray-600 gap-2">
                    <Share2 className="h-4 w-4" />
                    <span className="text-xs">Share</span>
                </Button> */}
            </CardFooter>
        </Card>
    )
}

