import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
  label,
  placeholder,
  className = '',
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);

  const insertText = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);
    
    // Restore focus and selection (next tick)
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-neutral-700">{label}</label>
      )}
      
      <div className="overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-2 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsPreview(false)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                !isPreview
                  ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200'
                  : 'text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900'
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setIsPreview(true)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                isPreview
                  ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200'
                  : 'text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900'
              }`}
            >
              Preview
            </button>
          </div>

          {!isPreview && (
            <div className="flex items-center gap-1 border-l border-neutral-200 pl-2">
              <ToolbarButton onClick={() => insertText('**', '**')} label="B" title="Bold" />
              <ToolbarButton onClick={() => insertText('*', '*')} label="I" title="Italic" />
              <ToolbarButton onClick={() => insertText('`', '`')} label="<>" title="Code" />
              <ToolbarButton onClick={() => insertText('- ')} label="List" title="Bullet List" />
              <ToolbarButton onClick={() => insertText('[', '](url)')} label="Link" title="Link" />
            </div>
          )}
        </div>

        {/* Editor / Preview Area */}
        <div className="relative min-h-[200px]">
          {isPreview ? (
            <div className="prose prose-neutral prose-sm max-w-none p-4">
              {value ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
              ) : (
                <p className="text-neutral-400 italic">Nothing to preview</p>
              )}
            </div>
          ) : (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="h-full min-h-[200px] w-full resize-y border-0 bg-transparent p-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-0"
            />
          )}
        </div>
      </div>
      <p className="text-xs text-neutral-500">
        Styling with Markdown is supported.
      </p>
    </div>
  );
}

function ToolbarButton({ onClick, label, title }: { onClick: () => void; label: string; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded p-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
    >
      {label === 'List' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
      ) : (
        label
      )}
    </button>
  );
}
