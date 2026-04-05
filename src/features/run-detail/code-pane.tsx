import { useEffect, useState } from 'react'
import { Code } from 'lucide-react'
import { ScrollArea, ScrollBar } from '#/components/ui/scroll-area'
import { codeToHtml } from 'shiki'

const LANGUAGE_MAP: Record<string, string> = {
  go: 'go',
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
}

function useHighlightedCode(code: string, language: string): string {
  const [html, setHtml] = useState('')

  useEffect(() => {
    let cancelled = false
    const lang = LANGUAGE_MAP[language] ?? 'text'
    void codeToHtml(code, {
      lang,
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    }).then((result) => {
      if (!cancelled) setHtml(result)
    })
    return () => {
      cancelled = true
    }
  }, [code, language])

  return html
}

export function CodePane({ code, language }: { code: string; language: string }) {
  const html = useHighlightedCode(code, language)

  return (
    <div data-testid="step-code-pane" className="flex min-h-0 min-w-0 basis-1/2 flex-col border-r border-(--line)">
      <div className="flex shrink-0 items-center gap-2 border-b border-(--line) px-4 py-2">
        <Code className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-bold text-foreground uppercase">Code</span>
        <span className="text-xs font-semibold text-muted-foreground uppercase">{language}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {html ? (
          <div
            className="p-4 text-xs leading-relaxed [&_code]:font-mono [&_pre]:bg-transparent! [&_pre]:whitespace-pre"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="p-4 font-mono text-xs leading-relaxed whitespace-pre text-foreground">{code}</pre>
        )}
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

export function CodePaneEmpty() {
  return (
    <div
      data-testid="step-code-pane-empty"
      className="flex min-h-0 flex-1 flex-col items-center justify-center border-r border-(--line)"
    >
      <span className="text-xs text-muted-foreground">No action executed in this step.</span>
    </div>
  )
}
