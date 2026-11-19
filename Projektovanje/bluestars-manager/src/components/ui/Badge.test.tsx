import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../../lib/i18n'
import { StatusBadge } from './Badge'

describe('StatusBadge', () => {
  it('shows the translated label for the given enum domain', () => {
    render(<StatusBadge kind="reservationStatus" value="CHECKED_IN" />)
    expect(screen.getByText('Prijavljena')).toBeInTheDocument()
  })

  it('shows the raw value when no translation exists', () => {
    render(<StatusBadge kind="taskStatus" value="ARCHIVED" />)
    expect(screen.getByText('ARCHIVED')).toBeInTheDocument()
  })
})
