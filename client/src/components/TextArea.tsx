import type { TextareaHTMLAttributes } from 'react'

function TextArea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={['field-area', 'glass', className].filter(Boolean).join(' ')} {...props} />
}

export default TextArea
