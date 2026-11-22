import { useEffect, useRef } from 'react'

export function GoogleSignInButton({ renderButton }: { renderButton: (element: HTMLElement) => void }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = host.current
    if (!element) return
    renderButton(element)
    return () => { element.replaceChildren() }
  }, [renderButton])
  return <div ref={host} className="min-h-11" aria-label="Sign in with Google" />
}
