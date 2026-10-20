async function cargarDatosRecientes() {
  const haceUnaSemana = new Date();
  haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);

  // Traer trabajos de la última semana
  const { data: trabajos } = await supabase
    .from('trabajos')
    .select(`
      *,
      imagenes_adjuntas (url_imagen)
    `)
    .gte('fecha_inicio', haceUnaSemana.toISOString())
    .order('fecha_inicio', { ascending: false });

  // Traer avisos de la última semana O los importantes
  const { data: avisos } = await supabase
    .from('avisos')
    .select(`
      *,
      imagenes_adjuntas (url_imagen)
    `)
    .or(`created_at.gte.${haceUnaSemana.toISOString()},es_importante.eq.true`)
    .order('created_at', { ascending: false });

  // Aquí renderizas los datos en tu HTML...
  console.log(trabajos, avisos);
}

function descargarRespaldoCSV(trabajos, avisos) {
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Cabeceras de Trabajos
  csvContent += "TIPO,TITULO,DESCRIPCION,FECHA,FOTOS\n";
  
  trabajos.forEach(t => {
    const fotos = t.imagenes_adjuntas.map(img => img.url_imagen).join(" | ");
    csvContent += `TRABAJO,"${t.titulo}","${t.descripcion}","${t.fecha_inicio}","${fotos}"\n`;
  });

  avisos.forEach(a => {
    const fotos = a.imagenes_adjuntas.map(img => img.url_imagen).join(" | ");
    const importante = a.es_importante ? "SI" : "NO";
    csvContent += `AVISO,"${a.titulo}","${a.mensaje}","${a.created_at}","${fotos}"\n`;
  });

  // Crear el enlace de descarga
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `respaldo_condominio_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}