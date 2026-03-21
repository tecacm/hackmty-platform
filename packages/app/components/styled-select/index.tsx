import React from 'react'

export type SelectOption = { label: string; value: string }

type StyledSelectProps = {
  label: string
  value?: string
  placeholder?: string
  options: SelectOption[]
  onValueChange: (value: string) => void
  subtitle?: string
  style?: React.CSSProperties
}

export function StyledSelect({ label, value, placeholder = 'Select...', options, onValueChange, subtitle, style }: StyledSelectProps) {
  const selectedValue = value ?? ''

  return (
    <div style={{ marginBottom: 8, width: '100%' }}>
      <label style={{ display: 'block', color: '#ffffff', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{label}</label>
      <select
        value={selectedValue}
        onChange={(e) => onValueChange(e.target.value)}
        style={{
          minHeight: 50,
          width: '100%',
          borderRadius: 12,
          backgroundColor: '#f5f5f57b',
          color: '#ffffff',
          border: '1px solid #ccc',
          fontSize: 16,
          padding: '0 12px',
          ...style,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {subtitle ? <p style={{ color: '#d4d4d4', fontSize: 12, marginTop: 4 }}>{subtitle}</p> : null}
    </div>
  )
}

