CREATE OR REPLACE FUNCTION public.validate_certificate(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cert RECORD;
  v_professor_name TEXT;
BEGIN
  SELECT 
    c.id,
    c.status,
    c.issued_at,
    c.revoked_at,
    c.revocation_reason,
    c.public_code,
    c.validation_uuid::text as validation_uuid,
    c.codigo_certificado,
    c.project_id,
    p.title as project_title,
    p.start_date,
    p.end_date,
    p.workload_hours,
    p.campus,
    COALESCE(pr_prof.nome_completo, TRIM(pr_prof.first_name || ' ' || pr_prof.last_name)) as professor_name,
    COALESCE(pr_student.nome_completo, TRIM(pr_student.first_name || ' ' || pr_student.last_name)) as student_name
  INTO v_cert
  FROM certificates c
  JOIN projects p ON p.id = c.project_id
  JOIN profiles pr_student ON pr_student.id = c.student_id
  LEFT JOIN profiles pr_prof ON pr_prof.id = p.professor_id
  WHERE c.public_code = p_code
     OR c.validation_uuid::text = p_code
     OR c.codigo_certificado = p_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Certificate not found');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'certificate', jsonb_build_object(
      'student_name', v_cert.student_name,
      'project_title', v_cert.project_title,
      'period', v_cert.start_date::text || ' a ' || v_cert.end_date::text,
      'workload_hours', v_cert.workload_hours,
      'campus', v_cert.campus,
      'professor_name', v_cert.professor_name,
      'public_code', v_cert.public_code,
      'codigo_certificado', v_cert.codigo_certificado,
      'validation_uuid', v_cert.validation_uuid,
      'status', v_cert.status,
      'issued_at', v_cert.issued_at,
      'revoked_at', v_cert.revoked_at,
      'revocation_reason', v_cert.revocation_reason
    )
  );
END;
$function$;
