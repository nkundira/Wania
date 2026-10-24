import { Link } from 'react-router-dom';
import { renderCaption } from '../utils/format';

export function Caption({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {renderCaption(text).map((part) => {
        if (part.type === 'hashtag') {
          const tag = part.value.slice(1);
          return (
            <Link key={part.key} to={`/hashtag/${encodeURIComponent(tag)}`} className="font-medium text-grape-300 hover:underline">
              {part.value}
            </Link>
          );
        }
        if (part.type === 'mention') {
          return (
            <Link key={part.key} to={`/u/${part.value.slice(1)}`} className="font-medium text-grape-300 hover:underline">
              {part.value}
            </Link>
          );
        }
        return <span key={part.key}>{part.value}</span>;
      })}
    </span>
  );
}
