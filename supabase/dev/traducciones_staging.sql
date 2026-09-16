-- Traducciones de ejemplo para los checklists del seed de staging (correr después de 0004).
-- Islandés hecho por Crevy: sirve para probar la pantalla, no como texto final.
update public.checklists set traducciones = '{
  "en": {"nombre": "Offices — standard", "tareas": ["Empty bins", "Vacuum carpets", "Clean desks", "Full bathrooms", "Kitchen and microwave", "Interior glass"]},
  "is": {"nombre": "Skrifstofur — staðall", "tareas": ["Tæma ruslafötur", "Ryksuga teppi", "Þrífa skrifborð", "Salerni að fullu", "Eldhús og örbylgjuofn", "Gler að innan"]}
}'::jsonb where id = 't_oficinas';

update public.checklists set traducciones = '{
  "en": {"nombre": "Restaurant", "tareas": ["Degrease kitchen", "Floors with disinfectant", "Bathrooms", "Tables and chairs", "Take out trash and recycling"]},
  "is": {"nombre": "Veitingastaður", "tareas": ["Fituhreinsa eldhús", "Gólf með sótthreinsiefni", "Salerni", "Borð og stólar", "Fara út með rusl og endurvinnslu"]}
}'::jsonb where id = 't_gastro';

update public.checklists set traducciones = '{
  "en": {"nombre": "Airbnb — guest turnover", "tareas": ["Change sheets", "Clean towels", "Full bathroom", "Kitchen and fridge", "Restock amenities", "Final photo of each room"]},
  "is": {"nombre": "Airbnb — gestaskipti", "tareas": ["Skipta um rúmföt", "Hrein handklæði", "Baðherbergi að fullu", "Eldhús og ísskápur", "Fylla á snyrtivörur", "Lokamynd af hverju rými"]}
}'::jsonb where id = 't_airbnb';
