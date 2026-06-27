# Dominio: Commerce (Tenant)

Un **Commerce** representa a un cliente de nuestra plataforma B2B. Es el pilar de la arquitectura Multi-Tenant.
Todo en el sistema, desde las facturas hasta los chunks vectoriales, tiene una dependencia ineludible hacia un `Commerce`. 
Si se elimina un Commerce, sus datos desaparecen.
