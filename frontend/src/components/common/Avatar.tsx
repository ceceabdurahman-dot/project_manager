import React from 'react';

interface Props { name: string; size?: 'xs'|'sm'|'md'|'lg'; src?: string; }

const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg' };
const colors = ['bg-blue-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500','bg-teal-500'];

export const Avatar: React.FC<Props> = ({ name, size='sm', src }) => {
  const color = colors[name.charCodeAt(0) % colors.length];
  if (src) return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover`} />;
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};
