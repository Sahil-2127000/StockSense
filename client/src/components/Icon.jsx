export default function Icon({ name, className = 'i', style, title }) {
  return (
    <svg className={className} style={style} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <use href={`#${name}`} />
    </svg>
  );
}
