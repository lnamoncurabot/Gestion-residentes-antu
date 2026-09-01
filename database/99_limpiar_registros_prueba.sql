-- Limpieza para etapa de pruebas online.
-- Borra registros operativos sin eliminar residentes, usuarios ni roles.

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM alertas;
DELETE FROM administraciones_medicamentos;
DELETE FROM controles_ciclos;
DELETE FROM registros_nutricion;
DELETE FROM registros_profesionales;
DELETE FROM registros_cam;
DELETE FROM controles_peso
WHERE origen IN ('Nutricionista', 'Mensual', 'Otro');

ALTER TABLE alertas AUTO_INCREMENT = 1;
ALTER TABLE administraciones_medicamentos AUTO_INCREMENT = 1;
ALTER TABLE controles_ciclos AUTO_INCREMENT = 1;
ALTER TABLE registros_nutricion AUTO_INCREMENT = 1;
ALTER TABLE registros_profesionales AUTO_INCREMENT = 1;
ALTER TABLE registros_cam AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;
