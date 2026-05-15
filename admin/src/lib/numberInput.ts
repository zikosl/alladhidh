export function numberInputValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '';
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue === 0 ? '' : String(value);
}

export function parseNumberInput(value: string) {
  return value.trim() === '' ? 0 : Number(value);
}
