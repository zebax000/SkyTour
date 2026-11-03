-- Script de actualización para rellenar los campos nuevos de los documentos de demostración en Neon.
-- NO se ejecuta automáticamente: revísalo antes de correrlo en la consola SQL de Neon.
-- Solo actualiza filas donde los campos nuevos siguen nulos, usando datos coherentes con el tipo de documento y el proveedor.

BEGIN;

UPDATE documento AS d
SET
    entidad_emisora = COALESCE(
        d.entidad_emisora,
        CASE
            WHEN d.tipo ILIKE '%RNT%' OR d.tipo ILIKE '%Registro Nacional de Turismo%'
                THEN 'Ministerio de Comercio, Industria y Turismo'
            WHEN d.tipo ILIKE '%RUT%'
                THEN 'Dirección de Impuestos y Aduanas Nacionales (DIAN)'
            WHEN d.tipo ILIKE '%Cámara de Comercio%'
                THEN 'Cámara de Comercio de ' || p.ciudad
            WHEN d.tipo ILIKE '%Póliza%' OR d.tipo ILIKE '%Seguro%'
                THEN 'Seguros SURA Colombia'
            WHEN d.tipo ILIKE '%SOAT%'
                THEN 'Seguros Mundial'
            WHEN d.tipo ILIKE '%técnico-mecánica%' OR d.tipo ILIKE '%tecnico-mecanica%'
                THEN 'Centro de Diagnóstico Automotor de ' || p.ciudad
            WHEN d.tipo ILIKE '%sanitario%'
                THEN 'Secretaría de Salud de ' || p.ciudad
            WHEN d.tipo ILIKE '%aérea%' OR d.tipo ILIKE '%aeronáutica%'
                THEN 'Aeronáutica Civil de Colombia (Aerocivil)'
            WHEN d.tipo ILIKE '%guía%' OR d.tipo ILIKE '%guia%'
                THEN 'Consejo Profesional de Guías de Turismo'
            WHEN d.tipo ILIKE '%calidad%'
                THEN 'ICONTEC Internacional'
            WHEN d.tipo ILIKE '%Contrato%'
                THEN 'SkyTour S.A.S. y ' || p.nombre
            ELSE 'Entidad Reguladora de ' || p.ciudad
        END
    ),
    numero_documento = COALESCE(
        d.numero_documento,
        UPPER(SUBSTRING(REGEXP_REPLACE(d.tipo, '[^a-zA-Z]', '', 'g') FROM 1 FOR 3))
        || '-' || TO_CHAR(d.fecha_emision, 'YYYY')
        || '-' || LPAD(d.id::text, 4, '0')
    ),
    titular = COALESCE(d.titular, p.nombre),
    identificacion_titular = COALESCE(d.identificacion_titular, p.nit),
    lugar = COALESCE(d.lugar, p.ciudad),
    objeto = COALESCE(
        d.objeto,
        CASE
            WHEN d.tipo ILIKE '%RNT%' OR d.tipo ILIKE '%Registro Nacional de Turismo%'
                THEN 'Habilitación oficial para prestar servicios turísticos en ' || p.ciudad || '.'
            WHEN d.tipo ILIKE '%RUT%'
                THEN 'Identificación y clasificación tributaria del prestador turístico.'
            WHEN d.tipo ILIKE '%Cámara de Comercio%'
                THEN 'Certificación de existencia, representación legal y matrícula mercantil vigente.'
            WHEN d.tipo ILIKE '%Póliza%' OR d.tipo ILIKE '%SOAT%'
                THEN 'Cobertura de responsabilidad civil y amparo ante accidentes durante la operación.'
            WHEN d.tipo ILIKE '%Contrato%'
                THEN 'Acuerdo marco de prestación de servicios turísticos y tarifas corporativas.'
            ELSE 'Soporte documental de ' || LOWER(d.tipo) || ' para operación turística.'
        END
    ),
    resumen = COALESCE(
        d.resumen,
        d.tipo || ' expedido a nombre de ' || p.nombre || ' (NIT ' || p.nit || ') en ' || p.ciudad
        || '. Vigente desde ' || TO_CHAR(d.fecha_emision, 'YYYY-MM-DD')
        || ' hasta ' || TO_CHAR(d.fecha_vencimiento, 'YYYY-MM-DD') || '.'
    )
FROM proveedor AS p
WHERE d.proveedor_id = p.id
  AND (
      d.entidad_emisora IS NULL
      OR d.numero_documento IS NULL
      OR d.titular IS NULL
      OR d.identificacion_titular IS NULL
      OR d.lugar IS NULL
      OR d.objeto IS NULL
      OR d.resumen IS NULL
  );

COMMIT;
