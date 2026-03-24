import * as React from 'react'
import { Separator as SeparatorPrimitive } from 'radix-ui'

import { cn } from '#/lib/utils'

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  const orientationClassName = orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px'

  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn('shrink-0 bg-border', orientationClassName, className)}
      {...props}
    />
  )
}

export { Separator }
