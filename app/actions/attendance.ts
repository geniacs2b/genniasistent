"use server";

import { attendanceService } from "@/services/attendanceService";

export async function validateQr(token: string) {
  try {
    const result = await attendanceService.validateQrToken(token);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function registerAttendanceByDocument(token: string, numeroDocumento: string) {
  try {
    const result = await attendanceService.registerAttendanceByDocument(token, numeroDocumento);
    // Use the inner 'ok' field to determine the logical success of the action
    if (result && (result.ok === true || result.success === true)) {
      return { success: true, data: result };
    }
    return { success: false, data: result, error: result?.mensaje || result?.message || "Error de validación." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Keep legacy action for backwards compatibility
export async function submitAttendance(qrToken: string, tipoDocumento: string, numeroDocumento: string) {
  try {
    const result = await attendanceService.registerAttendanceByDocument(qrToken, numeroDocumento);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
