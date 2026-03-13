// Tipos generados o inferidos de la estructura de base de datos descrita por el usuario
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      eventos: {
        Row: {
          id: string
          titulo: string
          descripcion: string | null
          fecha_inicio: string | null
          fecha_fin: string | null
          modalidad: string | null
          lugar: string | null
          cupo_maximo: number | null
          porcentaje_minimo_asistencia: number | null
          slug: string
          activo: boolean
          tipo_evento_id: string | null
          plantilla_certificado_id: string | null
        }
        Insert: any
        Update: any
      }
      formularios: {
        Row: {
          id: string
          evento_id: string
          descripcion: string | null
        }
        Insert: any
        Update: any
      }
      formulario_campos: {
        Row: {
          id: string
          formulario_id: string
          tipo: string
          etiqueta: string
          requerido: boolean
          opciones: Json | null
          orden: number
        }
        Insert: any
        Update: any
      }
      personas: {
        Row: {
          id: string
          tipo_documento: string
          numero_documento: string
          correo: string
          correo_verificado: boolean
          // otros campos posibles
        }
        Insert: any
        Update: any
      }
      inscripciones: {
        Row: {
          id: string
          evento_id: string
          persona_id: string
          estado: 'pendiente_verificacion' | 'inscrito' | 'confirmado' | 'asistio' | 'aprobado' | 'certificado_generado' | 'enviado'
          fecha_registro: string
        }
        Insert: any
        Update: any
      }
      respuestas_formulario: {
        Row: {
          id: string
          inscripcion_id: string
          respuestas: Json
        }
        Insert: any
        Update: any
      }
      verificaciones_correo: {
        Row: {
          id: string
          inscripcion_id: string
          token: string
          estado: 'pendiente' | 'verificado' | 'cancelado'
          expires_at: string
        }
        Insert: any
        Update: any
      }
      sesiones_evento: {
        Row: {
          id: string
          evento_id: string
          nombre: string
          fecha: string
        }
        Insert: any
        Update: any
      }
      qr_tokens_asistencia: {
        Row: {
          id: string
          sesion_id: string
          token: string
          expira_en: string
          activo: boolean
        }
        Insert: any
        Update: any
      }
      asistencias: {
        Row: {
          id: string
          evento_id: string
          sesion_id: string
          persona_id: string
          fecha_hora: string
          qr_token_id: string
        }
        Insert: any
        Update: any
      }
      plantillas_certificado: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          archivo_url: string
          width: number
          height: number
          activo: boolean
        }
        Insert: any
        Update: any
      }
      plantilla_campos_certificado: {
        Row: {
          id: string
          plantilla_certificado_id: string
          tipo_campo: string // nombre_completo, numero_documento, evento, fecha, codigo_certificado
          pos_x: number
          pos_y: number
          width: number
          height: number
          font_family: string
          font_size: number
          font_weight: string
          text_align: string
          color: string
          line_height: number
          letter_spacing: number
          auto_fit: boolean
          visible: boolean
          orden: number
        }
        Insert: any
        Update: any
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      registrar_inscripcion_evento: {
        Args: {
          p_evento_id: string
          p_datos_persona: Json // {"tipo_documento", "numero_documento", "correo", ...}
          p_respuestas: Json
        }
        Returns: {
          inscripcion_id: string
          token_verificacion: string
          estado: string
        }
      }
      verificar_correo_inscripcion: {
        Args: {
          p_token: string
        }
        Returns: {
          exito: boolean
          mensaje: string
          estado_token: string
        }
      }
      actualizar_correo_y_reenviar_verificacion: {
        Args: {
          p_numero_documento: string
          p_tipo_documento: string
          p_nuevo_correo: string
        }
        Returns: {
          exito: boolean
          nuevo_token: string
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
