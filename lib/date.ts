
export const BOGOTA_TIMEZONE = 'America/Bogota';

/**
 * Convierte cualquier fecha (string ISO o Date) a un objeto Date en Bogotá,
 * pero manteniendo la referencia correcta de tiempo (UTC).
 * En JS, los objetos Date siempre son UTC internamente, pero esta función
 * ayuda a asegurar que estemos operando con el valor correcto.
 */
export function getBogotaDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  
  if (typeof date === 'string') {
    // Normalizar espacio por T para asegurar compatibilidad con todos los navegadores (ej: Safari)
    const normalized = date.includes(' ') && !date.includes('T') 
      ? date.replace(' ', 'T') 
      : date;

    if (normalized.length === 10 && normalized.includes('-')) {
      return new Date(`${normalized}T00:00:00-05:00`);
    }

    if (normalized.includes('T')) {
      const parts = normalized.split('T');
      // Si no tiene zona horaria ni indicador Z, asumimos Bogotá (-05:00)
      if (!normalized.includes('Z') && !normalized.match(/[+-]\d{2}:\d{2}$/)) {
        return new Date(`${parts[0]}T${parts[1].substring(0, 8)}-05:00`);
      }
    }
    
    // Fallback al constructor estándar con la cadena normalizada
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  }
  
  return isNaN(date.getTime()) ? null : date;
}


/**
 * Combina una fecha y una hora (de columnas separadas) en un objeto Date de Bogotá.
 */
export function getBogotaDateTime(datePart: string | null | undefined, timePart: string | null | undefined): Date | null {
  if (!datePart) return null;
  
  const dateStr = datePart.includes('T') ? datePart.split('T')[0] : datePart;
  const timeStr = timePart || "00:00:00";
  
  // timeStr suele venir como HH:mm:ss o HH:mm
  return new Date(`${dateStr}T${timeStr.substring(0, 8)}-05:00`);
}

/**
 * Formatea una fecha proveniente de Supabase (UTC) a horario Colombia para la UI.
 * @param date Valor a formatear
 * @param options Intl.DateTimeFormatOptions
 * @returns String formateado
 */
export function formatToBogota(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }
): string {
  if (!date) return '-';
  try {
    let d: Date;
    if (typeof date === 'string') {
      if (date.length === 10 && date.includes('-')) {
        d = new Date(`${date}T00:00:00-05:00`);
      } else {
        d = new Date(date);
      }
    } else {
      d = date;
    }
    
    if (isNaN(d.getTime())) return '-';
    
    return new Intl.DateTimeFormat('es-CO', {
      ...options,
      timeZone: BOGOTA_TIMEZONE,
    }).format(d);
  } catch (error) {
    console.error('Error formatting date to Bogota:', error);
    return '-';
  }
}

/**
 * Formatea un string de hora (HH:mm o HH:mm:ss) a formato 12h con AM/PM
 */
export function formatTimeAMPM(time: string | null | undefined): string {
  if (!time) return '';
  try {
    const parts = time.split(':');
    if (parts.length < 2) return time;
    
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // la hora '0' debe ser '12'
    
    return `${hours}:${minutes} ${ampm}`;
  } catch (error) {
    return time || '';
  }
}

/**
 * Devuelve las partes de la fecha en horario de Bogotá.
 * Muy útil para componentes de UI que deben ser consistentes independientemente de la zona horaria local.
 */
export function getBogotaParts(date: Date | null | undefined) {
  if (!date) return { hours: 12, minutes: 0, ampm: 'AM' as const };
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BOGOTA_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value;
  
  const hourStr = getPart('hour') || "12";
  const minuteStr = getPart('minute') || "00";
  const dayPeriod = getPart('dayPeriod') || "AM";

  return {
    hours: parseInt(hourStr, 10),
    minutes: parseInt(minuteStr, 10),
    ampm: (dayPeriod.toUpperCase() === 'PM' ? 'PM' : 'AM') as 'AM' | 'PM'
  };
}

/**
 * Crea una nueva fecha preservando el día pero seteando la hora en contexto Bogotá.
 */
export function setBogotaTime(date: Date, hours: number, minutes: number, ampm: 'AM' | 'PM'): Date {
  const d = new Date(date);
  // Obtenemos solo YYYY-MM-DD del date en Bogotá
  const dateStr = getBogotaDateString(d);
  
  let adjustedHours = hours;
  if (ampm === "PM" && hours < 12) adjustedHours += 12;
  if (ampm === "AM" && hours === 12) adjustedHours = 0;

  // Reconstruimos la fecha como local de Bogotá
  return new Date(`${dateStr}T${String(adjustedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-05:00`);
}

/**
 * Formatea una fecha para inputs datetime-local (YYYY-MM-DDThh:mm) en hora Bogotá.
 */
export function toBogotaISO(date: string | Date | null | undefined): string {
  if (!date) return "";
  try {
    const d = typeof date === 'string' ? getBogotaDate(date) : date;
    if (!d || isNaN(d.getTime())) return "";

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: BOGOTA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value;

    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    let hour = getPart('hour');
    const minute = getPart('minute');

    // Manejo de posibles variaciones en el formato h23/h24
    if (hour === '24') hour = '00';

    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch (error) {
    return "";
  }
}

/**
 * Interpreta un string de un input local (YYYY-MM-DDThh:mm) como hora de Bogotá y lo devuelve en UTC ISO para Supabase.
 */
export function fromBogotaLocal(localString: string): string | null {
  if (!localString) return null;
  try {
    // Si ya incluye zona horaria (ej: de un Date.toISOString()), lo devolvemos tal cual
    if (localString.includes('Z') || localString.match(/[+-]\d{2}:\d{2}$/)) {
      return localString;
    }

    // Si es un formato YYYY-MM-DDThh:mm, le forzamos el offset de Bogotá para que el constructor de Date lo maneje correctamente
    const isoWithOffset = localString.includes('T') 
      ? `${localString}:00-05:00` 
      : `${localString}T00:00:00-05:00`;
    
    const d = new Date(isoWithOffset);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch (error) {
    return null;
  }
}

/**
 * Devuelve la parte de la fecha (YYYY-MM-DD) en horario de Bogotá.
 * Útil para inputs de tipo date y comparaciones por día.
 */
export function getBogotaDateString(date: string | Date | null | undefined): string {
  if (!date) return "";
  try {
    let d: Date;
    if (typeof date === 'string') {
      if (date.length === 10 && date.includes('-')) {
        // Already YYYY-MM-DD, just return it
        return date;
      }
      d = new Date(date);
    } else {
      d = date;
    }

    if (isNaN(d.getTime())) return "";

    return new Intl.DateTimeFormat('en-CA', {
      timeZone: BOGOTA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch (error) {
    return "";
  }
}

/**
 * Devuelve la fecha/hora actual garantizada como un objeto Date.
 * Útil para comparaciones contra fechas provenientes de la DB (UTC).
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Verifica si un formulario está disponible basado en sus fechas de apertura y cierre (en UTC).
 * Realiza la comparación contra el momento actual.
 */
export function isAvailable(apertura: string | Date | null | undefined, cierre: string | Date | null | undefined): {
  available: boolean;
  isBefore: boolean;
  isAfter: boolean;
} {
  const now = getNow();
  const dOpen = getBogotaDate(apertura);
  const dClose = getBogotaDate(cierre);

  const isBefore = dOpen ? now < dOpen : false;
  const isAfter = dClose ? now > dClose : false;

  return {
    available: !isBefore && !isAfter,
    isBefore,
    isAfter
  };
}

