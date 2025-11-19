import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageBubbleProps {
  message: {
    content: string;
    image_url: string | null;
    created_at: string;
    profiles?: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-10 w-10">
        <AvatarImage src={message.profiles?.avatar_url || ''} />
        <AvatarFallback>
          {message.profiles?.full_name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className={`flex-1 max-w-[70%] ${isOwn ? 'flex flex-col items-end' : ''}`}>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground">
            {message.profiles?.full_name || 'Unknown User'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        <div
          className={`rounded-lg px-4 py-2 ${
            isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-md my-2"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code
                    className="bg-black/20 px-1 py-0.5 rounded text-sm font-mono"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  {children}
                </a>
              )
            }}
          >
            {message.content}
          </ReactMarkdown>

          {message.image_url && (
            <img
              src={message.image_url}
              alt="Uploaded"
              className="mt-2 rounded-lg max-w-full max-h-96 object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}
