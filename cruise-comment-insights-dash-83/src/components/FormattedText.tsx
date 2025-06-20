import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Component to format raw text with markdown-like formatting
 * Handles: **bold text**, *italic*, \n line breaks, bullet points, etc.
 */
export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  if (!text) {
    return <p className="text-gray-500 italic">No text available</p>;
  }
  const formatText = (rawText: string) => {
    // Clean up the text first - handle various newline patterns
    let cleanText = rawText
      .replace(/\\n/g, '\n')  // Convert literal \n to actual newlines
      .replace(/\\r\\n/g, '\n')  // Convert Windows line endings
      .replace(/\\r/g, '\n')  // Convert Mac line endings
      .replace(/\n{3,}/g, '\n\n')  // Reduce multiple newlines to double
      .replace(/\t/g, '    ')  // Convert tabs to spaces
      .trim();

    // Split by actual newlines and process each line
    const lines = cleanText.split(/\n+/);
    
    return lines.map((line, lineIndex) => {
      if (!line.trim()) return null;
      
      // Process formatting within each line
      let formattedLine = line.trim();
      
      // Handle both **bold** and *italic* patterns
      const formatLine = (text: string) => {
        const parts: (string | JSX.Element)[] = [];
        let remainingText = text;
        let partIndex = 0;
        
        // Process bold patterns first (**text**)
        const boldPattern = /\*\*(.*?)\*\*/g;
        let boldMatch;
        let lastBoldIndex = 0;
        
        while ((boldMatch = boldPattern.exec(text)) !== null) {
          // Add text before the bold part
          if (boldMatch.index > lastBoldIndex) {
            const beforeText = text.slice(lastBoldIndex, boldMatch.index);
            if (beforeText) {
              parts.push(beforeText);
            }
          }
          
          // Add the bold part
          parts.push(
            <strong key={`bold-${lineIndex}-${partIndex++}`} className="font-semibold text-gray-900">
              {boldMatch[1]}
            </strong>
          );
          
          lastBoldIndex = boldMatch.index + boldMatch[0].length;
        }
        
        // Add remaining text after bold patterns
        if (lastBoldIndex < text.length) {
          const remainingAfterBold = text.slice(lastBoldIndex);
          
          // Now process italic patterns in the remaining text
          const italicPattern = /\*([^*]+)\*/g;
          let italicMatch;
          let lastItalicIndex = 0;
          
          while ((italicMatch = italicPattern.exec(remainingAfterBold)) !== null) {
            // Add text before the italic part
            if (italicMatch.index > lastItalicIndex) {
              const beforeItalic = remainingAfterBold.slice(lastItalicIndex, italicMatch.index);
              if (beforeItalic) {
                parts.push(beforeItalic);
              }
            }
            
            // Add the italic part
            parts.push(
              <em key={`italic-${lineIndex}-${partIndex++}`} className="italic text-gray-700">
                {italicMatch[1]}
              </em>
            );
            
            lastItalicIndex = italicMatch.index + italicMatch[0].length;
          }
          
          // Add any remaining text after italic patterns
          if (lastItalicIndex < remainingAfterBold.length) {
            const finalText = remainingAfterBold.slice(lastItalicIndex);
            if (finalText) {
              parts.push(finalText);
            }
          } else if (lastItalicIndex === 0) {
            // No italic patterns found, add the whole remaining text
            parts.push(remainingAfterBold);
          }
        }
        
        return parts.length > 0 ? parts : [text];
      };
      
      const formattedParts = formatLine(formattedLine);
        // Handle bullet points and numbered lists
      const isBulletPoint = formattedLine.match(/^[-•*]\s+/);
      const isNumberedList = formattedLine.match(/^\d+\.\s+/);
      const isSubBullet = formattedLine.match(/^\s+[-•*]\s+/);
      const isDoubleIndentBullet = formattedLine.match(/^\s{4,}[-•*]\s+/);
      const isHeader = formattedLine.match(/^#{1,6}\s+/);
      const isQuote = formattedLine.match(/^>\s+/);
      
      if (isBulletPoint) {
        const bulletText = formattedLine.replace(/^[-•*]\s+/, '');
        const bulletFormattedParts = formatLine(bulletText);
        return (
          <div key={lineIndex} className="flex items-start gap-2 mb-2">
            <span className="text-blue-600 font-bold mt-1 flex-shrink-0">•</span>
            <span className="flex-1 text-gray-800">{bulletFormattedParts}</span>
          </div>
        );
      } else if (isSubBullet) {
        const subBulletText = formattedLine.replace(/^\s+[-•*]\s+/, '');
        const subBulletFormattedParts = formatLine(subBulletText);
        return (
          <div key={lineIndex} className="flex items-start gap-2 mb-2 ml-4">
            <span className="text-blue-400 font-medium mt-1 flex-shrink-0">◦</span>
            <span className="flex-1 text-gray-700">{subBulletFormattedParts}</span>
          </div>        );
      } else if (isDoubleIndentBullet) {
        const doubleIndentText = formattedLine.replace(/^\s{4,}[-•*]\s+/, '');
        const doubleIndentFormattedParts = formatLine(doubleIndentText);
        return (
          <div key={lineIndex} className="flex items-start gap-2 mb-2 ml-8">
            <span className="text-blue-300 font-medium mt-1 flex-shrink-0">▪</span>
            <span className="flex-1 text-gray-600">{doubleIndentFormattedParts}</span>
          </div>
        );
      } else if (isHeader) {
        const headerLevel = formattedLine.match(/^#{1,6}/)?.[0].length || 1;
        const headerText = formattedLine.replace(/^#{1,6}\s+/, '');
        const headerFormattedParts = formatLine(headerText);
        const headerClass = headerLevel <= 2 ? 'text-xl font-bold text-gray-900 mb-3 mt-4' 
                          : headerLevel <= 4 ? 'text-lg font-semibold text-gray-800 mb-2 mt-3'
                          : 'text-base font-medium text-gray-700 mb-2 mt-2';
        return (
          <div key={lineIndex} className={headerClass}>
            {headerFormattedParts}
          </div>
        );
      } else if (isQuote) {
        const quoteText = formattedLine.replace(/^>\s+/, '');
        const quoteFormattedParts = formatLine(quoteText);
        return (
          <div key={lineIndex} className="border-l-4 border-blue-300 pl-4 py-2 mb-2 bg-blue-50 rounded-r">
            <span className="flex-1 text-gray-700 italic">{quoteFormattedParts}</span>
          </div>
        );
      } else if (isNumberedList) {
        const numberMatch = formattedLine.match(/^(\d+\.)\s+/);
        const numberText = formattedLine.replace(/^\d+\.\s+/, '');
        const numberFormattedParts = formatLine(numberText);
        return (
          <div key={lineIndex} className="flex items-start gap-2 mb-2">
            <span className="text-blue-600 font-semibold mt-0.5 flex-shrink-0">{numberMatch?.[1]}</span>
            <span className="flex-1 text-gray-800">{numberFormattedParts}</span>
          </div>
        );
      } else {
        // Regular paragraph
        return (
          <p key={lineIndex} className="mb-2 leading-relaxed text-gray-800 last:mb-0">
            {formattedParts}
          </p>
        );
      }
    }).filter(Boolean);
  };

  return (
    <div className={`formatted-text ${className}`}>
      {formatText(text)}
    </div>
  );
};
