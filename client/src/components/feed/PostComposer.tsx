import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export function PostComposer({ onPostCreated }: { onPostCreated: () => void }) {
  const { user } = useAuth();
  const [isPosting, setIsPosting] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[100px] p-4 w-full max-w-none',
      },
    },
  });

  const handlePost = async () => {
    if (!editor || editor.isEmpty || !user) return;
    setIsPosting(true);

    const content = editor.getHTML();

    try {
      const { error } = await supabase.from('feed_posts').insert({
        author_id: user.id,
        content,
        created_at: new Date().toISOString(),
        visibility: 'public', // Default
      });

      if (error) throw error;
      
      editor.commands.clearContent();
      onPostCreated();
    } catch (err) {
      console.error('Failed to post:', err);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="mb-6 shadow-sm border-gray-200">
      <CardContent className="p-0">
        <EditorContent editor={editor} className="min-h-[120px]" />
        <div className="flex justify-between items-center p-3 border-t bg-gray-50/50 rounded-b-lg">
            <div className="flex gap-2 text-sm text-gray-500">
                {/* Future: Attachment buttons */}
                <span className="text-xs">Supports Markdown & Rich Text</span>
            </div>
            <Button 
                onClick={handlePost} 
                disabled={isPosting || !editor || editor.isEmpty}
                size="sm"
                className="px-6"
            >
                {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Post
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

