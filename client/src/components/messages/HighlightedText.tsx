import React from "react";

interface HighlightedTextProps {
  text: string;
  searchTerm: string;
  className?: string;
}

export const HighlightedText = ({ 
  text, 
  searchTerm, 
  className = "" 
}: HighlightedTextProps) => {
  if (!searchTerm.trim()) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(
    `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 
    'gi'
  );
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark 
            key={index} 
            className="bg-yellow-300 dark:bg-yellow-600 text-foreground rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
};
