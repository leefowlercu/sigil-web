'use client'

import { ArrowDown, ArrowDownToLine } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '#/components/ui/button'
import { ScrollArea } from '#/components/ui/scroll-area'
import { getEventDisplayInfo } from '#/lib/timeline-events'
import type { TurnTokens } from '#/lib/timeline-events'
import type { EventEnvelopeView } from '#/lib/protocol'
import { cn } from '#/lib/utils'

const NEAR_BOTTOM_THRESHOLD_PX = 24
const SCROLL_CONTROL_FADE_MS = 150

function formatTimestamp(iso?: string): string {
  if (!iso) return '--'
  const date = new Date(iso)
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function distanceFromBottom(viewport: HTMLDivElement): number {
  return viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop
}

function scrollViewportToBottom(
  viewport: HTMLDivElement,
  behavior: ScrollBehavior,
) {
  if (typeof viewport.scrollTo === 'function') {
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior,
    })
    return
  }
  viewport.scrollTop = viewport.scrollHeight
}

export function RunTimelineTab({
  events,
  isLive,
  runId,
  turnTokenMap,
}: {
  events: EventEnvelopeView[]
  isLive: boolean
  runId: string
  turnTokenMap: Map<string, TurnTokens>
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const lastRunIdRef = useRef(runId)
  const programmaticScrollStateRef = useRef({
    active: false,
    frameID: null as number | null,
    idleFrames: 0,
    lastScrollTop: 0,
  })
  const [isAutoFollowEnabled, setIsAutoFollowEnabled] = useState(isLive)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [isScrollControlMounted, setIsScrollControlMounted] = useState(false)
  const [isScrollControlVisible, setIsScrollControlVisible] = useState(false)

  const clearProgrammaticScroll = useCallback((syncViewportState: boolean) => {
    const state = programmaticScrollStateRef.current
    state.active = false
    state.idleFrames = 0
    if (state.frameID != null) {
      cancelAnimationFrame(state.frameID)
      state.frameID = null
    }

    if (!syncViewportState) {
      return
    }

    const viewport = viewportRef.current
    if (viewport == null) {
      return
    }

    setIsNearBottom(distanceFromBottom(viewport) <= NEAR_BOTTOM_THRESHOLD_PX)
    setIsOverflowing(viewport.scrollHeight > viewport.clientHeight + 1)
  }, [])

  const syncScrollState = useCallback(
    (updateAutoFollow: boolean) => {
      const viewport = viewportRef.current
      if (viewport == null) {
        return
      }

      const nearBottom =
        distanceFromBottom(viewport) <= NEAR_BOTTOM_THRESHOLD_PX
      const overflowing = viewport.scrollHeight > viewport.clientHeight + 1
      setIsOverflowing(overflowing)

      if (programmaticScrollStateRef.current.active) {
        if (nearBottom) {
          clearProgrammaticScroll(false)
          setIsNearBottom(true)
        }
        return
      }

      setIsNearBottom(nearBottom)

      if (updateAutoFollow && isLive) {
        setIsAutoFollowEnabled(nearBottom)
      }
    },
    [clearProgrammaticScroll, isLive],
  )

  const startProgrammaticScroll = useCallback(() => {
    const viewport = viewportRef.current
    if (viewport == null) {
      return
    }

    const state = programmaticScrollStateRef.current
    if (state.frameID != null) {
      cancelAnimationFrame(state.frameID)
    }
    state.active = true
    state.idleFrames = 0
    state.lastScrollTop = viewport.scrollTop

    const monitor = () => {
      const activeState = programmaticScrollStateRef.current
      const currentViewport = viewportRef.current

      if (!activeState.active || currentViewport == null) {
        clearProgrammaticScroll(false)
        return
      }

      const nearBottom =
        distanceFromBottom(currentViewport) <= NEAR_BOTTOM_THRESHOLD_PX
      if (nearBottom) {
        clearProgrammaticScroll(false)
        setIsNearBottom(true)
        setIsOverflowing(
          currentViewport.scrollHeight > currentViewport.clientHeight + 1,
        )
        return
      }

      if (Math.abs(currentViewport.scrollTop - activeState.lastScrollTop) < 1) {
        activeState.idleFrames += 1
      } else {
        activeState.idleFrames = 0
        activeState.lastScrollTop = currentViewport.scrollTop
      }

      // Release the latch if the smooth scroll gets interrupted and stops
      // progressing before the viewport reaches the bottom.
      if (activeState.idleFrames >= 4) {
        clearProgrammaticScroll(true)
        return
      }

      activeState.frameID = requestAnimationFrame(monitor)
    }

    state.frameID = requestAnimationFrame(monitor)
  }, [clearProgrammaticScroll])

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior) => {
      const viewport = viewportRef.current
      if (viewport == null) {
        return
      }

      if (behavior === 'smooth') {
        startProgrammaticScroll()
      }

      scrollViewportToBottom(viewport, behavior)
      setIsNearBottom(true)
      setIsOverflowing(viewport.scrollHeight > viewport.clientHeight + 1)
      if (isLive) {
        setIsAutoFollowEnabled(true)
      }
    },
    [isLive, startProgrammaticScroll],
  )

  useEffect(() => {
    if (lastRunIdRef.current === runId) {
      return
    }
    lastRunIdRef.current = runId
    clearProgrammaticScroll(false)
    const viewport = viewportRef.current
    if (viewport == null) {
      setIsAutoFollowEnabled(isLive)
      setIsNearBottom(true)
      setIsOverflowing(false)
      return
    }

    if (isLive) {
      scrollToBottom('auto')
      return
    }

    setIsAutoFollowEnabled(false)
    viewport.scrollTop = 0
    syncScrollState(false)
  }, [clearProgrammaticScroll, isLive, runId, scrollToBottom, syncScrollState])

  useEffect(() => {
    const viewport = viewportRef.current
    if (viewport == null) {
      return
    }

    const handleScroll = () => {
      syncScrollState(true)
    }

    syncScrollState(false)
    viewport.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      viewport.removeEventListener('scroll', handleScroll)
    }
  }, [syncScrollState])

  useEffect(() => {
    const viewport = viewportRef.current
    if (viewport == null) {
      return
    }

    const frameID = requestAnimationFrame(() => {
      if (isAutoFollowEnabled) {
        scrollToBottom('auto')
        return
      }
      syncScrollState(false)
    })

    return () => {
      cancelAnimationFrame(frameID)
    }
  }, [
    events.length,
    isAutoFollowEnabled,
    isLive,
    scrollToBottom,
    syncScrollState,
  ])

  const showScrollControl = isOverflowing && !isNearBottom
  const scrollControlLabel = isLive ? 'Follow latest event' : 'Scroll to bottom'
  const ScrollControlIcon = isLive ? ArrowDownToLine : ArrowDown

  useEffect(() => {
    return () => {
      clearProgrammaticScroll(false)
    }
  }, [clearProgrammaticScroll])

  useEffect(() => {
    let frameID: number | null = null
    let timeoutID: number | null = null

    if (showScrollControl) {
      setIsScrollControlMounted(true)
      frameID = requestAnimationFrame(() => {
        setIsScrollControlVisible(true)
      })
    } else {
      setIsScrollControlVisible(false)
      timeoutID = window.setTimeout(() => {
        setIsScrollControlMounted(false)
      }, SCROLL_CONTROL_FADE_MS)
    }

    return () => {
      if (frameID != null) {
        cancelAnimationFrame(frameID)
      }
      if (timeoutID != null) {
        window.clearTimeout(timeoutID)
      }
    }
  }, [showScrollControl])

  return (
    <div className="relative h-full" data-testid="run-detail-timeline-tab">
      <ScrollArea className="h-full" viewportRef={viewportRef}>
        <div className="flex flex-col gap-0 px-5 py-4">
          <div className="relative flex flex-col gap-0">
            {events.map((event, i) => {
              const isLast = i === events.length - 1
              const info = getEventDisplayInfo(event, turnTokenMap)
              return (
                <div key={event.seq} className="relative flex gap-3 pb-4">
                  {!isLast && (
                    <span className="absolute top-4 left-[7px] h-[calc(100%-8px)] w-px bg-[var(--line)]" />
                  )}
                  <span className="relative z-10 mt-1 flex size-[15px] shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)]">
                    <span
                      className={`size-[5px] rounded-full ${
                        isLast && isLive
                          ? 'bg-[var(--sigil-accent)]'
                          : info.dotColorClass
                      }`}
                    />
                  </span>
                  <div className="flex flex-1 flex-col gap-0.5 pt-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                        {formatTimestamp(event.ts)}
                      </span>
                      <span className="text-[0.68rem] font-semibold text-[var(--foreground)]">
                        {info.label}
                      </span>
                    </div>
                    {info.summary && (
                      <p className="text-[0.6rem] leading-relaxed text-[var(--muted-foreground)]">
                        {info.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[0.55rem] font-semibold text-[var(--muted-foreground)] opacity-40">
                        {event.type}
                      </span>
                      <span className="text-[0.55rem] font-semibold text-[var(--muted-foreground)] opacity-40">
                        seq {event.seq}
                      </span>
                      {event.nodeId && (
                        <span className="font-mono text-[0.55rem] text-[var(--muted-foreground)] opacity-40">
                          {event.nodeId.slice(0, 13)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </ScrollArea>

      {isScrollControlMounted && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <Button
            type="button"
            size="icon-sm"
            aria-label={scrollControlLabel}
            aria-hidden={!isScrollControlVisible}
            title={scrollControlLabel}
            tabIndex={isScrollControlVisible ? 0 : -1}
            data-testid="run-detail-timeline-scroll-to-bottom"
            className={cn(
              'size-10 rounded-full border border-[var(--sigil-accent-border)] bg-[var(--surface-strong)] text-[var(--foreground)] shadow-lg transition-all duration-150 ease-out hover:border-[var(--sigil-accent-focus-border)] hover:bg-[var(--sigil-accent-hover)] hover:text-[var(--sigil-accent)]',
              isScrollControlVisible
                ? 'pointer-events-auto translate-y-0 opacity-100'
                : 'pointer-events-none translate-y-1 opacity-0',
            )}
            onClick={() => scrollToBottom('smooth')}
          >
            <ScrollControlIcon className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
