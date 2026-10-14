// Генерує тимчасові тайлмапи public/tilemaps/<tilemap>.json для кожної зони з vinnytsia.json.
// Tiled JSON, тайли 32 px, шари ground і collision, tileset.png. Стіни по периметру,
// під дверима й виходами — прохід і позначка іншим тайлом. У L3 мапи замінять справжні з Tiled.
// Запуск з кореня фронтенд-репозиторію: npm run maps:placeholder
import fs from 'node:fs'
import path from 'node:path'

const CITY_FILE = path.resolve('src/mocks/cities/vinnytsia.json')
const OUT_DIR = path.resolve('public/tilemaps')
const TILE = 32
const MARGIN = 64

// Тайли tileset.png (gid = індекс + 1): 1 трава, 2 пісок, 3 вода (колізія), 4 стіна (колізія).
const GRASS = 1
const SAND = 2
const WALL = 4

const city = JSON.parse(fs.readFileSync(CITY_FILE, 'utf8'))

function mapSize(zone) {
  const gates = [...zone.doors, ...zone.exits]
  // spawn у дверях і виходах — це точка в зоні призначення, тож беремо ті, що ведуть сюди.
  const arrivals = city.zones
    .flatMap((other) => [...other.doors, ...other.exits])
    .filter((gate) => gate.target === zone.id)
    .map((gate) => gate.spawn)
  const points = [zone.spawn, ...zone.npcs, ...(zone.landmarks ?? []), ...arrivals]
  // Точки — центри об'єктів, тож їм потрібен запас; виходи можуть лежати прямо на стіні.
  const right = Math.max(
    ...points.map((point) => point.x + MARGIN),
    ...gates.map((gate) => gate.x + gate.w),
  )
  const bottom = Math.max(
    ...points.map((point) => point.y + MARGIN),
    ...gates.map((gate) => gate.y + gate.h),
  )
  return {
    width: Math.max(10, Math.ceil(right / TILE)),
    height: Math.max(8, Math.ceil(bottom / TILE)),
  }
}

function tilesUnder(rect, width, height) {
  const tiles = []
  const left = Math.max(0, Math.floor(rect.x / TILE))
  const top = Math.max(0, Math.floor(rect.y / TILE))
  const right = Math.min(width - 1, Math.ceil((rect.x + rect.w) / TILE) - 1)
  const bottom = Math.min(height - 1, Math.ceil((rect.y + rect.h) / TILE) - 1)
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) tiles.push(row * width + col)
  }
  return tiles
}

function buildMap(zone) {
  const { width, height } = mapSize(zone)
  const floor = zone.type === 'outdoor' ? GRASS : SAND
  const marker = zone.type === 'outdoor' ? SAND : GRASS
  const ground = new Array(width * height).fill(floor)
  const collision = new Array(width * height).fill(0)

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (row === 0 || col === 0 || row === height - 1 || col === width - 1) {
        collision[row * width + col] = WALL
      }
    }
  }

  for (const gate of [...zone.doors, ...zone.exits]) {
    for (const index of tilesUnder(gate, width, height)) {
      collision[index] = 0
      ground[index] = marker
    }
  }

  const layer = (id, name, data) => ({
    data, height, width, id, name, opacity: 1, type: 'tilelayer', visible: true, x: 0, y: 0,
  })

  return {
    compressionlevel: -1,
    height,
    width,
    infinite: false,
    layers: [layer(1, 'ground', ground), layer(2, 'collision', collision)],
    nextlayerid: 3,
    nextobjectid: 1,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: TILE,
    tilewidth: TILE,
    tilesets: [
      {
        columns: 2, firstgid: 1, image: 'tileset.png', imageheight: 64, imagewidth: 64,
        margin: 0, name: 'tileset', spacing: 0, tilecount: 4, tileheight: TILE, tilewidth: TILE,
        tiles: [
          { id: 2, properties: [{ name: 'collides', type: 'bool', value: true }] },
          { id: 3, properties: [{ name: 'collides', type: 'bool', value: true }] },
        ],
      },
    ],
    type: 'map',
    version: '1.10',
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true })
for (const zone of city.zones) {
  const map = buildMap(zone)
  fs.writeFileSync(path.join(OUT_DIR, `${zone.tilemap}.json`), JSON.stringify(map))
  console.log(`ok   ${zone.tilemap}.json  ${map.width}x${map.height}  (${zone.id})`)
}
