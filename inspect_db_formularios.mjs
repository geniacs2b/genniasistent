import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function test_full_creation() {
  const eventoId = 'ce3ea5fd-4ecb-4a6b-94f1-04c7abdfb6ed'; // Evento real encontrado antes
  const titulo = 'Marketing Digital';
  
  console.log('--- Testing FULL Form + Fields Creation ---');
  
  // 1. Crear Formulario
  const slugBase = titulo.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const formPayload = {
    evento_id: eventoId,
    nombre: `Inscripción - ${titulo} (Test Full)`,
    slug: `test-full-${Date.now()}`,
    descripcion: `Test full creation`,
    activo: true
  };

  const { data: form, error: formError } = await supabase
    .from("formularios")
    .insert(formPayload)
    .select('id')
    .single();

  if (formError) {
    console.error('STEP 1 FAILED:', formError.message);
    process.exit(1);
  }

  const formId = form.id;
  console.log('STEP 1 SUCCESS! Form ID:', formId);

  // 2. Crear Campos
  const campos = [
    { label: "Nombres", tipo_campo: "text", obligatorio: true },
    { label: "Correo", tipo_campo: "email", obligatorio: true }
  ];

  const camposMapped = campos.map((c, i) => ({
    formulario_id: formId,
    nombre_campo: (c.label || `campo_${i}`).toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    label: c.label,
    tipo_campo: c.tipo_campo,
    obligatorio: c.obligatorio,
    orden: i,
  }));

  console.log('Inserting fields:', JSON.stringify(camposMapped, null, 2));

  const { error: camposError } = await supabase.from("formulario_campos").insert(camposMapped);

  if (camposError) {
    console.error('STEP 2 FAILED:', camposError.message);
    console.error('Details:', JSON.stringify(camposError, null, 2));
    // Cleanup form even if fields failed
    await supabase.from("formularios").delete().eq("id", formId);
    process.exit(1);
  }

  console.log('STEP 2 SUCCESS! All fields inserted.');

  // Cleanup
  await supabase.from("formularios").delete().eq("id", formId);
  console.log('Cleanup successful.');
}

test_full_creation();
