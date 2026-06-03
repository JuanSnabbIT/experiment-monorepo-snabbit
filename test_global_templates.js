const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔍 Navegando a http://localhost:5173...');
  try {
    await page.goto('http://localhost:5173/auth/login', { waitUntil: 'networkidle' });
  } catch (e) {
    console.log('⚠️ Frontend no está disponible en localhost:5173');
    console.log('Instrucciones manuales:');
    console.log('1. En terminal: cd frontend && npm run dev');
    console.log('2. Abre http://localhost:5173');
    await browser.close();
    return;
  }

  console.log('✓ Frontend está corriendo');
  console.log('\n📋 Pasos de verificación manual:\n');
  console.log('1. Loguea con: admin@demo.cl / Demo1234!');
  console.log('2. Ve a RRHH > Trabajadores');
  console.log('3. Haz clic en "Ana Pérez" > "Crear Contrato"');
  console.log('4. Completa los pasos: Básicos → Trabajador → Contrato → Jornada → Remun. → Previsión');
  console.log('5. En el Step 7 "Revisión", busca la sección "Plantilla de contrato"');
  console.log('6. Deberías ver 4 plantillas agrupadas bajo "Globales":');
  console.log('   - Contrato Individual de Trabajo');
  console.log('   - Contrato a Plazo Fijo');
  console.log('   - Contrato de Reemplazo');
  console.log('   - Anexo de Modificación de Remuneración\n');
  
  console.log('⏸️ Abre devtools (F12) > Pestaña Network para ver las llamadas a la API');
  console.log('   Busca: /api/plantillas-contrato/ → respuesta debe tener es_global: true\n');

  await page.waitForTimeout(2000);
  await browser.close();
  process.exit(0);
})();
