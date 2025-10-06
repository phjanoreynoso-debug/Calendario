# Calendario de Vigilancia

Aplicación estática para gestionar el calendario de vigilancia con:
- Arrastre para reordenar filas por persona (dentro del mismo grupo)
- Persistencia de orden por grupo en `localStorage`
- SADOFE siempre al final del listado

## Requisitos
- Un navegador moderno (Chrome, Edge, Firefox)
- Opcional: Node.js si prefieres servidor local

## Uso local
### Opción 1: abrir directamente
- Abre `index.html` haciendo doble clic. La app funciona porque usa `localStorage`.

### Opción 2: servidor local con Node
```bash
npm install -g serve
serve -s . -l 8000
```
Luego abre `http://localhost:8000/`.

### Opción 3: servidor con `server.js`
```bash
node server.js
```
Luego abre `http://localhost:8000/`.

## Características de reordenamiento
- Solo administradores pueden arrastrar.
- Arrastra la celda de nombre dentro del mismo grupo (semana/sadofe).
- El orden se guarda en `localStorage`:
  - `vigilancia-order-sem` para semana
  - `vigilancia-order-sadofe` para sadofe

## Publicación en GitHub
1. Inicializa Git en la carpeta del proyecto:
```bash
git init
git add .
git commit -m "Inicial: calendario con drag-and-drop y persistencia"
```
2. Crea un repositorio en GitHub y configura el remoto:
```bash
git branch -M main
git remote add origin <URL-del-repositorio>
git push -u origin main
```