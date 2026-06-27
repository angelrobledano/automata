# ADR Descartado: ¿Por qué NO Firebase?

Firebase es excelente para MVP, pero sus queries complejas (especialmente búsquedas vectoriales híbridas) son limitadas en Firestore estándar sin extensiones costosas. PostgreSQL nos da un control transaccional relacional que el negocio B2B requiere.
