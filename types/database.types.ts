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
          hora_inicio: string | null
          hora_fin: string | null
          modalidad: string | null
          lugar: string | null
          cupo_maximo: number | null
          porcentaje_minimo_asistencia: number | null
          activo: boolean
          estado: string | null
          requiere_asistencia: boolean | null
          min_sesiones_certificado: number | null
          tipo_evento_id: string | null
          plantilla_certificado_id: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: any
        Update: any
      }
      inscripciones: {
        Row: {
          id: string
          evento_id: string
          persona_id: string
          estado: string
          fecha_inscripcion: string | null
          fuente: string | null
          observaciones: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: any
        Update: any
      }
      formularios: {
        Row: {
          id: string
          evento_id: string
          nombre: string
          slug: string
          descripcion: string | null
          created_at: string
        }
        Insert: any
        Update: any
      }
      formulario_campos: {
        Row: {
          id: string
          formulario_id: string
          nombre_campo: string
          label: string
          tipo_campo: string
          obligatorio: boolean
          placeholder: string | null
          ayuda: string | null
          orden: number
          activo: boolean
          es_base: boolean
          validacion_json: Json | null
          opciones_json: Json | null
          ancho_visual: number | null
          created_at: string
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
          created_at: string
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
          created_at: string
        }
        Insert: any
        Update: any
      }
      qr_tokens_asistencia: {
        Row: {
          id: string
          evento_id: string | null
          sesion_evento_id: string
          token: string
          estado: string | null
          activo: boolean
          fecha_inicio_vigencia: string | null
          fecha_fin_vigencia: string | null
          creado_por: string | null
          fecha_activacion: string | null
          fecha_desactivacion: string | null
          desactivado_por: string | null
          observacion: string | null
          created_at: string
        }
        Insert: any
        Update: any
      }
      asistencias: {
        Row: {
          id: string
          evento_id: string
          sesion_evento_id: string
          persona_id: string
          inscripcion_id: string | null
          qr_token_id: string
          numero_documento_digitado: string | null
          metodo_registro: string | null
          fecha_hora_registro: string
          valido: boolean | null
          observacion: string | null
          created_at: string
        }
        Insert: any
        Update: any
      }
      plantillas_certificado: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          archivo_base_url: string
          ancho_px: number
          alto_px: number
          activo: boolean
          created_at: string
        }
        Insert: any
        Update: any
      }
      plantilla_campos_certificado: {
        Row: {
          id: string
          plantilla_certificado_id: string
          tipo_campo: string
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
    Functions: {
      registrar_inscripcion_evento: {
        Args: {
          p_evento_id: string
          p_datos_persona: Json
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
    }
  }
}
