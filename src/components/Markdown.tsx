import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Markdown({ content }: { content: string }) {
  return (
    <div className="krt-md leading-relaxed text-archive-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="font-serif text-3xl font-bold mb-6 pb-3 border-b border-archive-border">{children}</h1>,
          h2: ({ children }) => <h2 className="font-serif text-2xl font-bold mt-10 mb-4 pb-2 border-b border-archive-border">{children}</h2>,
          h3: ({ children }) => <h3 className="font-serif text-xl font-bold mt-8 mb-3">{children}</h3>,
          p: ({ children }) => <p className="mb-5 text-[15px] leading-loose">{children}</p>,
          a: ({ href, children }) => <a href={href} className="text-archive-accent underline underline-offset-4 hover:opacity-80">{children}</a>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-5 space-y-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-5 space-y-2">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-archive-accent bg-archive-paper px-6 py-4 my-6 text-sm italic text-archive-muted">{children}</blockquote>,
          code: ({ className, children }) => {
            const isBlock = (className ?? '').includes('language-');
            if (isBlock) {
              return <pre className="bg-archive-text/95 text-archive-paper p-6 my-6 overflow-x-auto text-sm leading-relaxed rounded-sm"><code className={className}>{children}</code></pre>;
            }
            return <code className="bg-archive-border/50 px-1.5 py-0.5 text-sm">{children}</code>;
          },
          table: ({ children }) => <div className="overflow-x-auto my-6"><table className="w-full text-sm border border-archive-border">{children}</table></div>,
          th: ({ children }) => <th className="border border-archive-border px-4 py-2 bg-archive-paper text-left font-serif">{children}</th>,
          td: ({ children }) => <td className="border border-archive-border px-4 py-2">{children}</td>,
          hr: () => <hr className="my-8 border-archive-border" />,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}