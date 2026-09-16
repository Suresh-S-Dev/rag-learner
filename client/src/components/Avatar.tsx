type Props = {
  name: string
  src: string
  size?: 'sm' | 'md' | 'lg'
}

function Avatar({ name, src, size = 'sm' }: Props) {
  const letter = (name.trim()[0] || '?').toUpperCase()
  if (src) return <img className={`avatar is-${size}`} src={src} alt="" />
  return <span className={`avatar is-${size} is-fallback`}>{letter}</span>
}

export default Avatar
