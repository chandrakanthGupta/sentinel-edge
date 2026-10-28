# VVIT 3D Campus Map

Interactive 3D exterior map of VVIT campus built with React, Three.js, and @react-three/fiber.

## Features

- **Full-Screen 3D Campus View**: Complete 3D exterior layout of the VVIT campus grounds, terrain, roadways, pathways, courtyards, trees, and architecture.
- **Campus Buildings**:
  - Central Block
  - A Block
  - B Block
  - C Block
  - D Block
  - Siemens Block
  - Viva School
- **Interactive Orbit Controls**: Drag to orbit, scroll wheel or pinch to zoom, and right-click to pan freely.
- **Simulated Network Packet Flow**: Animated traffic pulses continuously across campus nodes.

## How to Run

```powershell
npm install
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

## Embedded dashboard build

The production dashboard embeds this app from `../dashboard/static/campus3d/`. After changing the campus scene, build it with relative asset paths and copy the output into that directory:

```powershell
npm run build -- --base=./
Copy-Item dist\* ..\dashboard\static\campus3d -Recurse -Force
```

The dashboard sends a same-origin `SENTINEL_CAMERA_PROGRESS` message with normalized progress from `0` (angled view) to `1` (overhead view). The embedded scene validates the sender and origin before updating its camera.
