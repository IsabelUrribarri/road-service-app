// frontend/src/components/ui/role-badge.tsx
import React from 'react'
import { User } from '../../types'

interface RoleBadgeProps {
  role: User['role']
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ 
  role, 
  size = 'md', 
  className = '' 
}) => {
  const roleConfig = {
    super_admin: {
      label: 'Super Admin',
      color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
      icon: '👑'
    },
    company_admin: {
      label: 'Administrador',
      color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
      icon: '⚡'
    },
    worker: {
      label: 'Operador',
      color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
      icon: '👷'
    }
  }

  const config = roleConfig[role] || roleConfig.worker

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  return (
    <span 
      className={`
        inline-flex items-center space-x-1.5 font-medium rounded-full border
        ${sizeClasses[size]} 
        ${config.color} 
        ${className}
      `}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}