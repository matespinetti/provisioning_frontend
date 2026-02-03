/**
 * Timezone-aware datetime utilities
 *
 * These functions handle RFC3339 datetime strings while preserving the original
 * timezone offset from the API, preventing timezone conversion issues.
 */

/**
 * Parse an RFC3339 datetime string and extract the timezone offset
 *
 * @param dateString - RFC3339 formatted string (e.g., "2026-02-03T14:16:52+01:00" or "2026-02-03T14:16:52Z")
 * @returns Object with Date and timezone string, or undefined if parsing fails
 *
 * @example
 * parseRFC3339WithTimezone("2026-02-03T14:16:52+01:00")
 * // Returns: { date: Date(...), timezone: "+01:00" }
 */
export function parseRFC3339WithTimezone(dateString: string | null | undefined): {
  date: Date
  timezone: string
} | undefined {
  if (!dateString) return undefined

  try {
    // Parse the date string
    const date = new Date(dateString)

    // Check if date is valid
    if (Number.isNaN(date.getTime())) {
      console.warn('[parseRFC3339WithTimezone] Invalid date string:', dateString)
      return undefined
    }

    // Extract timezone using regex
    // Matches: +HH:MM, -HH:MM, or Z
    const timezoneMatch = dateString.match(/([+-]\d{2}:\d{2}|Z)$/)

    if (!timezoneMatch) {
      // No timezone found, default to API's expected timezone (+01:00)
      console.warn('[parseRFC3339WithTimezone] No timezone found, defaulting to +01:00:', dateString)
      return { date, timezone: '+01:00' }
    }

    const timezone = timezoneMatch[1]

    console.log('[parseRFC3339WithTimezone] Parsed:', {
      input: dateString,
      timezone,
      date: date.toISOString()
    })

    return { date, timezone }
  } catch (error) {
    console.error('[parseRFC3339WithTimezone] Error:', error, dateString)
    return undefined
  }
}

/**
 * Format a Date object to RFC3339 using a preserved timezone offset
 *
 * This function formats the date in the specified timezone rather than
 * converting to the browser's local timezone.
 *
 * @param date - JavaScript Date object
 * @param timezone - Timezone offset string (e.g., "+01:00", "Z", "-05:00")
 * @returns RFC3339 formatted string
 *
 * @example
 * const date = new Date("2026-02-03T13:16:52Z")
 * toRFC3339WithTimezone(date, "+01:00")
 * // Returns: "2026-02-03T14:16:52+01:00"
 */
export function toRFC3339WithTimezone(date: Date, timezone: string): string {
  // Handle UTC case
  if (timezone === 'Z') {
    const result = date.toISOString()
    console.log('[toRFC3339WithTimezone] UTC:', { date, timezone, result })
    return result
  }

  // Parse timezone offset
  const timezoneMatch = timezone.match(/([+-])(\d{2}):(\d{2})/)
  if (!timezoneMatch) {
    console.warn('Invalid timezone format, using UTC:', timezone)
    return date.toISOString()
  }

  const [, sign, hours, minutes] = timezoneMatch
  const offsetMinutes = (parseInt(hours) * 60 + parseInt(minutes)) * (sign === '+' ? 1 : -1)

  // Get the date/time components in UTC
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = date.getUTCFullYear()
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hour = pad(date.getUTCHours())
  const minute = pad(date.getUTCMinutes())
  const second = pad(date.getUTCSeconds())

  // Create UTC timestamp string and parse it
  const utcString = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
  const utcDate = new Date(utcString)

  // Add the timezone offset to get the local time in that timezone
  const localTime = new Date(utcDate.getTime() + offsetMinutes * 60 * 1000)

  // Format the local time components
  const localYear = localTime.getUTCFullYear()
  const localMonth = pad(localTime.getUTCMonth() + 1)
  const localDay = pad(localTime.getUTCDate())
  const localHour = pad(localTime.getUTCHours())
  const localMinute = pad(localTime.getUTCMinutes())
  const localSecond = pad(localTime.getUTCSeconds())

  const result = `${localYear}-${localMonth}-${localDay}T${localHour}:${localMinute}:${localSecond}${timezone}`

  console.log('[toRFC3339WithTimezone]', {
    inputDate: date.toISOString(),
    timezone,
    offsetMinutes,
    result
  })

  return result
}

/**
 * Format a date and timezone for display
 *
 * @param date - JavaScript Date object
 * @param timezone - Timezone offset string
 * @returns Human-readable datetime string with timezone indicator
 *
 * @example
 * formatDateTimeWithTimezone(new Date("2026-02-03T13:16:52Z"), "+01:00")
 * // Returns: "2026-02-03 14:16 +01:00"
 */
export function formatDateTimeWithTimezone(date: Date, timezone: string): string {
  // Handle UTC case
  if (timezone === 'Z') {
    const formatted = date.toISOString().slice(0, 16).replace('T', ' ')
    return `${formatted} UTC`
  }

  // Parse timezone offset
  const timezoneMatch = timezone.match(/([+-])(\d{2}):(\d{2})/)
  if (!timezoneMatch) {
    // Fallback to local string if timezone is invalid
    return date.toLocaleString()
  }

  const [, sign, hours, minutes] = timezoneMatch
  const offsetMinutes = (parseInt(hours) * 60 + parseInt(minutes)) * (sign === '+' ? 1 : -1)

  // Get UTC time and apply offset
  const utcTime = date.getTime()
  const localTime = new Date(utcTime + offsetMinutes * 60 * 1000)

  // Format for display
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = localTime.getUTCFullYear()
  const month = pad(localTime.getUTCMonth() + 1)
  const day = pad(localTime.getUTCDate())
  const hour = pad(localTime.getUTCHours())
  const minute = pad(localTime.getUTCMinutes())

  return `${year}-${month}-${day} ${hour}:${minute} ${timezone}`
}

/**
 * Format a date and timezone for display (simple version without timezone suffix)
 *
 * @param date - JavaScript Date object
 * @param timezone - Timezone offset string
 * @returns Human-readable datetime string without timezone indicator
 *
 * @example
 * formatDateTimeSimple(new Date("2026-02-03T13:16:52Z"), "+01:00")
 * // Returns: "2026-02-03 14:16"
 */
export function formatDateTimeSimple(date: Date, timezone: string): string {
  // Handle UTC case
  if (timezone === 'Z') {
    const formatted = date.toISOString().slice(0, 16).replace('T', ' ')
    return formatted
  }

  // Parse timezone offset
  const timezoneMatch = timezone.match(/([+-])(\d{2}):(\d{2})/)
  if (!timezoneMatch) {
    // Fallback to local string if timezone is invalid
    return date.toLocaleString()
  }

  const [, sign, hours, minutes] = timezoneMatch
  const offsetMinutes = (parseInt(hours) * 60 + parseInt(minutes)) * (sign === '+' ? 1 : -1)

  // Get UTC time and apply offset
  const utcTime = date.getTime()
  const localTime = new Date(utcTime + offsetMinutes * 60 * 1000)

  // Format for display
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = localTime.getUTCFullYear()
  const month = pad(localTime.getUTCMonth() + 1)
  const day = pad(localTime.getUTCDate())
  const hour = pad(localTime.getUTCHours())
  const minute = pad(localTime.getUTCMinutes())

  return `${year}-${month}-${day} ${hour}:${minute}`
}

/**
 * Helper to convert Date | undefined to the new format
 * @deprecated Use parseRFC3339WithTimezone instead
 */
export function toDateOrUndefined(value?: string | null) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}
