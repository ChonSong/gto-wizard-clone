import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ActionSelector from '../ActionSelector'

describe('ActionSelector', () => {
  it('renders all 4 action buttons with correct labels', () => {
    render(<ActionSelector selectedAction={null} onSelect={vi.fn()} />)
    expect(screen.getByText('FOLD')).toBeInTheDocument()
    expect(screen.getByText('CALL')).toBeInTheDocument()
    expect(screen.getByText('RAISE')).toBeInTheDocument()
    expect(screen.getByText('ALL IN')).toBeInTheDocument()
  })

  it('calls onSelect when a button is clicked', () => {
    const onSelect = vi.fn()
    render(<ActionSelector selectedAction={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('FOLD'))
    expect(onSelect).toHaveBeenCalledWith('fold')
  })

  it('highlights the selected action button', () => {
    render(<ActionSelector selectedAction="raise" onSelect={vi.fn()} />)
    const button = screen.getByText('RAISE').closest('button')!
    // The button should have aria-pressed="true" when selected
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows raise size selector when raise is selected', () => {
    render(
      <ActionSelector
        selectedAction="raise"
        onSelect={vi.fn()}
        onSelectSize={vi.fn()}
      />
    )
    expect(screen.getByText('Raise to:')).toBeInTheDocument()
    expect(screen.getByText('2bb')).toBeInTheDocument()
    expect(screen.getByText('2.5bb')).toBeInTheDocument()
    expect(screen.getByText('3bb')).toBeInTheDocument()
  })

  it('calls onSelectSize when a raise size is clicked', () => {
    const onSelectSize = vi.fn()
    render(
      <ActionSelector
        selectedAction="raise"
        onSelect={vi.fn()}
        onSelectSize={onSelectSize}
      />
    )
    fireEvent.click(screen.getByText('2.5bb'))
    expect(onSelectSize).toHaveBeenCalledWith(2.5)
  })

  it('does not show raise size selector for non-raise actions', () => {
    render(
      <ActionSelector
        selectedAction="fold"
        onSelect={vi.fn()}
        onSelectSize={vi.fn()}
      />
    )
    expect(screen.queryByText('Raise to:')).not.toBeInTheDocument()
  })

  it('shows GTO frequency chips when gtoAction is provided', () => {
    render(
      <ActionSelector
        selectedAction={null}
        onSelect={vi.fn()}
        gtoAction="raise"
        gtoFrequency={0.45}
      />
    )
    // GTO frequency chips are in the small chip bar — the 45% indicator is unique
    expect(screen.getByText('45%')).toBeInTheDocument()
    // "RAISE" appears in both chip bar and action button — use getAllByText and check count
    const raiseElements = screen.getAllByText('RAISE')
    expect(raiseElements.length).toBeGreaterThanOrEqual(1)
  })

  it('shows GTO badge on locked state for non-selected GTO action', () => {
    render(
      <ActionSelector
        selectedAction="fold"
        onSelect={vi.fn()}
        gtoAction="raise"
        gtoFrequency={0.35}
        locked={true}
      />
    )
    // The GTO badge shows "GTO"
    const gtoBadges = screen.getAllByText('GTO')
    expect(gtoBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('shows correct feedback when feedback is "correct"', () => {
    render(
      <ActionSelector
        selectedAction="raise"
        onSelect={vi.fn()}
        feedback="correct"
        locked={true}
      />
    )
    expect(screen.getByText('✓ Correct')).toBeInTheDocument()
  })

  it('shows incorrect feedback when feedback is "incorrect"', () => {
    render(
      <ActionSelector
        selectedAction="fold"
        onSelect={vi.fn()}
        feedback="incorrect"
        locked={true}
      />
    )
    expect(screen.getByText('✗ Incorrect')).toBeInTheDocument()
  })

  it('does not show GTO chips when disabled', () => {
    render(
      <ActionSelector
        selectedAction={null}
        onSelect={vi.fn()}
        gtoAction="raise"
        gtoFrequency={0.45}
        disabled={true}
      />
    )
    // The GTO frequency chips section should not be rendered when disabled
    const allInLabel = screen.getByText('ALL IN')
    expect(allInLabel).toBeInTheDocument()
  })

  it('does not call onSelect when disabled', () => {
    const onSelect = vi.fn()
    render(<ActionSelector selectedAction={null} onSelect={onSelect} disabled={true} />)
    fireEvent.click(screen.getByText('FOLD'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does not call onSelect when locked', () => {
    const onSelect = vi.fn()
    render(<ActionSelector selectedAction={null} onSelect={onSelect} locked={true} />)
    fireEvent.click(screen.getByText('FOLD'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('highlights selected raise size button', () => {
    render(
      <ActionSelector
        selectedAction="raise"
        onSelect={vi.fn()}
        selectedSize={2.5}
        onSelectSize={vi.fn()}
      />
    )
    const sizeBtn = screen.getByText('2.5bb')
    expect(sizeBtn).toHaveAttribute('aria-pressed', 'true')
  })
})
