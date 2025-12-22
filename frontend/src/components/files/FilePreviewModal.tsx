import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Button from '../ui/Button';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  content?: string;
  url?: string;
  type: 'markdown' | 'image' | 'pdf' | 'docx';
}

export default function FilePreviewModal({
  isOpen,
  onClose,
  fileName,
  content,
  url,
  type,
}: FilePreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-neutral-900">
            Preview: {fileName}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          {type === 'markdown' && content && (
            <div className="prose prose-neutral max-w-none rounded-lg bg-white p-8 shadow-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          )}
          
          {type === 'image' && url && (
            <div className="flex h-full items-center justify-center">
              <img 
                src={url} 
                alt={fileName} 
                className="max-h-full max-w-full rounded-lg object-contain shadow-sm" 
              />
            </div>
          )}

          {type === 'pdf' && url && (
            <iframe
              src={url}
              className="h-full w-full rounded-lg shadow-sm"
              title={fileName}
            />
          )}

          {type === 'docx' && content && (
            <div 
              className="prose prose-neutral max-w-none rounded-lg bg-white p-12 shadow-sm"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>

        <div className="border-t border-neutral-200 bg-white px-6 py-4 text-right">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
