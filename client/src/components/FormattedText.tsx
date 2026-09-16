type Props = {
  text: string
}

function FormattedText({ text }: Props) {
  const parts = text.split(/(\*\*[^*]+?\*\*)/g)
  return (
    <p className="answer">
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return <strong key={index}>{part.slice(2, -2)}</strong>
        }
        return <span key={index}>{part}</span>
      })}
    </p>
  )
}

export default FormattedText
