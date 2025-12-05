interface HighlightedTextProps {
  text: string;
  searchTerm: string;
}

export const HighlightedText = ({ text, searchTerm }: HighlightedTextProps) => {
  if (!searchTerm.trim()) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-yellow-200 dark:bg-yellow-600 dark:text-white rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};


