import type { ReactNode } from 'react'

type Props = {
  title: string
  className?: string
  children: ReactNode
}

function Panel({ title, className = '', children }: Props) {
  const classes = ['panel', 'glass', className].filter(Boolean).join(' ')
  return (
    <section className={classes}>
      <h2 className="panel-title">{title}</h2>
      {children}
    </section>
  )
}

export default Panel
