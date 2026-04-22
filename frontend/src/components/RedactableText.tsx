interface RedactableTextProps {
  originalText: string
  isPatching: boolean
  isRedacted: boolean
  newText?: string
}

export default function RedactableText({
  originalText,
  isPatching,
  isRedacted,
  newText,
}: RedactableTextProps) {
  if (isRedacted) {
    return (
      <span className="font-body text-base leading-relaxed">
        <span
          className="relative inline bg-on-background text-on-background select-none"
          aria-label="redacted"
          title="redacted"
        >
          {originalText}
        </span>
        {newText && (
          <span className="ml-2 text-primary-container font-body italic fade-in"
                style={{ color: '#b91c1c' }}>
            {newText}
          </span>
        )}
      </span>
    )
  }

  if (isPatching) {
    return (
      <span className="relative inline-block font-body text-base leading-relaxed">
        <span className="text-on-background/80">{originalText}</span>
        <span
          className="absolute inset-0 pointer-events-none redact-sweep"
          aria-hidden="true"
        />
      </span>
    )
  }

  return (
    <span className="font-body text-base leading-relaxed text-on-background/90">
      {originalText}
    </span>
  )
}
