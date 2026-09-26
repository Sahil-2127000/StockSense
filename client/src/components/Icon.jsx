import React from 'react';

export default function Icon({ name, style, className = 'i' }) {
  return (
    <svg className={className} style={style}>
      <use href={`#${name}`} />
    </svg>
  );
}
