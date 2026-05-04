/**
 * @author: @emerald-ui
 * @description: Shiny Button Component - A button with a shiny gradient effect
 * @version: 1.0.0
 * @license: MIT
 */
import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
function cn(...inputs: any[]) { return twMerge(clsx(inputs)) }

interface ShinyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
}

export default function ShinyButton({
  className,
  children = 'Shiny Day',
  ...props
}: ShinyButtonProps) {
  return (
    <button
      className={cn(
        'h-12 w-max rounded-sm border-none bg-[linear-gradient(325deg,#1e5a3a_0%,#4db87d_55%,#1e5a3a_90%)] bg-[length:280%_auto] px-6 py-2 font-medium text-white shadow-[0px_0px_20px_rgba(48,123,82,0.5),0px_5px_5px_-1px_rgba(48,123,82,0.25),inset_4px_4px_8px_rgba(77,184,125,0.5),inset_-4px_-4px_8px_rgba(30,90,58,0.35)] transition-[background] duration-700 hover:bg-right-top focus:ring-[#307b52] focus:ring-offset-1 focus:ring-offset-white focus:outline-none focus-visible:ring-2 dark:focus:ring-[#4db87d] dark:focus:ring-offset-black',
        className
      )}
      type='button'
      {...props}
    >
      {children}
    </button>
  )
}
