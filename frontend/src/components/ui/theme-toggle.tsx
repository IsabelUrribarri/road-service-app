import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { Button } from './button'
import { Moon, Sun, Monitor } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center space-x-1 bg-secondary/50 p-1 rounded-lg border border-border/50">
      <Button
        variant={theme === 'light' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setTheme('light')}
        className={`h-8 w-8 p-0 transition-all ${
          theme === 'light' 
            ? 'light:bg-white light:text-blue-600 light:shadow-sm' 
            : 'light:text-gray-600 light:hover:bg-white/50'
        }`}
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant={theme === 'system' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setTheme('system')}
        className={`h-8 w-8 p-0 transition-all ${
          theme === 'system' 
            ? 'light:bg-white light:text-blue-600 light:shadow-sm' 
            : 'light:text-gray-600 light:hover:bg-white/50'
        }`}
      >
        <Monitor className="h-4 w-4" />
      </Button>
      <Button
        variant={theme === 'dark' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setTheme('dark')}
        className={`h-8 w-8 p-0 transition-all ${
          theme === 'dark' 
            ? 'light:bg-white light:text-blue-600 light:shadow-sm' 
            : 'light:text-gray-600 light:hover:bg-white/50'
        }`}
      >
        <Moon className="h-4 w-4" />
      </Button>
    </div>
  )
}