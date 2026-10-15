// Генерує тимчасові тайлмапи public/tilemaps/<tilemap>.json для кожної зони з vinnytsia.json.
// Якщо в public/assets/kenney/ є паки Kenney, мапи малюються з їхніх тайлів (16 px):
// вулиця — RPG Urban (тротуар, газон, дорога, будівлі з дверима), приміщення — Roguelike Indoors.
// Інакше — прямокутники з tileset.png (32 px), як у L2.
// Мапи з Tiled (без властивості generated) не перезаписуються.
// Запуск з кореня фронтенд-репозиторію: npm run maps:placeholder
import fs from 'node:fs'
import path from 'node:path'

const CITY_FILE = path.resolve('src/mocks/cities/vinnytsia.json')
const OUT_DIR = path.resolve('public/tilemaps')
const GENERATED_MARK = 'gen-placeholder-maps'
const KENNEY_DIR = path.resolve('public/assets/kenney')
const MARGIN = 64

const city = JSON.parse(fs.readFileSync(CITY_FILE, 'utf8'))

// Перешкоди на тимчасових мапах (пікселі).
// center: будинок відділяє Соборну від Мурів — без короткого шляху (shortcut_mury) його треба обходити знизу.
// embankment: річка вздовж верху і міст через неї біля Соломії.
const LAYOUTS = {
  center: { blocks: [{ x: 672, y: 0, w: 128, h: 272 }] },
  embankment: {
    water: [{ x: 0, y: 64, w: 1024, h: 64 }],
    bridges: [{ x: 832, y: 64, w: 64, h: 64 }],
  },
}

function layoutOf(zone) {
  return { blocks: [], water: [], bridges: [], ...LAYOUTS[zone.id] }
}

// Вода з колізією, міст поверх неї — прохідний.
function drawRiver(grid, zone, { water, bridge }) {
  const { water: waterRects, bridges } = layoutOf(zone)
  for (const rect of waterRects) {
    for (const [col, row] of grid.cells(rect)) grid.set('collision', col, row, water)
  }
  for (const rect of bridges) {
    for (const [col, row] of grid.cells(rect)) {
      grid.set('collision', col, row, -1)
      grid.set('ground', col, row, bridge)
    }
  }
}

// --- Тайлсети -------------------------------------------------------------------------------
// Індекси тайлів (0 = лівий верхній) звірені з tilemap_packed.png і roguelikeIndoor_transparent.png.

const PLACEHOLDER = {
  tileSize: 32,
  tileset: {
    name: 'placeholder', image: 'tileset.png', columns: 2, tilecount: 4,
    imagewidth: 64, imageheight: 64, margin: 0, spacing: 0,
  },
  // 0 трава, 1 пісок, 2 вода, 3 стіна
  outdoor: { floor: 0, marker: 1, wall: 3, water: 2, bridge: 1 },
  interior: { floor: 1, marker: 0, wall: 3 },
  collides: [2, 3],
}

const URBAN = {
  name: 'kenney_urban',
  file: 'tilemap_packed.png',
  columns: 27, tilecount: 486, imagewidth: 432, imageheight: 288, margin: 0, spacing: 0,
  tiles: {
    grass: 28,
    sidewalk: 36,
    road: 440,
    water: 198,
    roofEdge: 90,
    roof: 117,
    cornice: 45,
    brick: 72,
    door: 284,
  },
}

const INDOORS = {
  name: 'kenney_indoors',
  file: 'roguelikeIndoor_transparent.png',
  columns: 27, tilecount: 486, imagewidth: 458, imageheight: 305, margin: 0, spacing: 1,
  tiles: {
    floor: 294,
    carpet: 24,
    wall: 267,
    door: 268,
  },
}

function findFile(dir, fileName) {
  if (!fs.existsSync(dir)) return null
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const found = findFile(full, fileName)
      if (found) return found
    } else if (entry.name === fileName) {
      return full
    }
  }
  return null
}

function kenneyTileset(pack, collides) {
  const file = findFile(KENNEY_DIR, pack.file)
  if (!file) return null
  const { name, columns, tilecount, imagewidth, imageheight, margin, spacing } = pack
  return {
    name, columns, tilecount, imagewidth, imageheight, margin, spacing,
    // Шлях відносно public/tilemaps/, як у Tiled.
    image: path.relative(OUT_DIR, file).split(path.sep).join('/'),
    collides,
  }
}

const urbanTiles = URBAN.tiles
const indoorTiles = INDOORS.tiles
const kenneyUrban = kenneyTileset(URBAN, [
  urbanTiles.roofEdge, urbanTiles.roof, urbanTiles.cornice, urbanTiles.brick, urbanTiles.water,
])
const kenneyIndoors = kenneyTileset(INDOORS, [indoorTiles.wall])

// --- Геометрія ------------------------------------------------------------------------------

function mapPixelSize(zone) {
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
  return { right, bottom }
}

class Grid {
  constructor(zone, tileSize) {
    const { right, bottom } = mapPixelSize(zone)
    this.tileSize = tileSize
    this.width = Math.max(320 / tileSize, Math.ceil(right / tileSize))
    this.height = Math.max(256 / tileSize, Math.ceil(bottom / tileSize))
    // Значення в шарах — індекс тайла (0-based) або -1, якщо порожньо.
    this.ground = new Array(this.width * this.height).fill(-1)
    this.collision = new Array(this.width * this.height).fill(-1)
  }

  inside(col, row) {
    return col >= 0 && row >= 0 && col < this.width && row < this.height
  }

  set(layer, col, row, tile) {
    if (this.inside(col, row)) this[layer][row * this.width + col] = tile
  }

  fill(layer, tile) {
    this[layer].fill(tile)
  }

  perimeter(layer, tile) {
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        if (row === 0 || col === 0 || row === this.height - 1 || col === this.width - 1) {
          this.set(layer, col, row, tile)
        }
      }
    }
  }

  ring(layer, inset, tile) {
    for (let row = inset; row < this.height - inset; row++) {
      for (let col = inset; col < this.width - inset; col++) {
        const edge = row === inset || col === inset ||
          row === this.height - 1 - inset || col === this.width - 1 - inset
        if (edge) this.set(layer, col, row, tile)
      }
    }
  }

  // Клітинки під прямокутником у пікселях.
  cells(rect) {
    const s = this.tileSize
    const cells = []
    const left = Math.floor(rect.x / s)
    const top = Math.floor(rect.y / s)
    const right = Math.ceil((rect.x + rect.w) / s) - 1
    const bottom = Math.ceil((rect.y + rect.h) / s) - 1
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (this.inside(col, row)) cells.push([col, row])
      }
    }
    return cells
  }
}

// --- Малювання ------------------------------------------------------------------------------

function drawPlaceholder(zone) {
  const grid = new Grid(zone, PLACEHOLDER.tileSize)
  const tiles = zone.type === 'outdoor' ? PLACEHOLDER.outdoor : PLACEHOLDER.interior
  grid.fill('ground', tiles.floor)
  grid.perimeter('collision', tiles.wall)
  for (const block of layoutOf(zone).blocks) {
    for (const [col, row] of grid.cells(block)) grid.set('collision', col, row, tiles.wall)
  }
  if (zone.type === 'outdoor') drawRiver(grid, zone, tiles)
  for (const gate of [...zone.doors, ...zone.exits]) {
    for (const [col, row] of grid.cells(gate)) {
      grid.set('collision', col, row, -1)
      grid.set('ground', col, row, tiles.marker)
    }
  }
  return { grid, tileset: { ...PLACEHOLDER.tileset, collides: PLACEHOLDER.collides } }
}

function drawUrban(zone) {
  const t = urbanTiles
  const grid = new Grid(zone, 16)
  // Парк — газон, решта вулиць — тротуар з газоном уздовж стін.
  grid.fill('ground', zone.id === 'park' ? t.grass : t.sidewalk)
  grid.ring('ground', 1, t.grass)
  grid.perimeter('collision', t.brick)

  drawRiver(grid, zone, { water: t.water, bridge: t.sidewalk })

  for (const block of layoutOf(zone).blocks) {
    const cells = grid.cells(block)
    const bottom = Math.max(...cells.map(([, row]) => row))
    for (const [col, row] of cells) {
      const tile = row === bottom ? t.brick : row === bottom - 1 ? t.cornice : t.roof
      grid.set('collision', col, row, tile)
    }
  }

  // Над кожними дверима — фасад будівлі: дах, карниз, цегла, двері в нижньому ряду.
  for (const door of zone.doors) {
    const doorCells = grid.cells(door)
    const doorCols = [...new Set(doorCells.map(([col]) => col))]
    const doorRow = Math.min(...doorCells.map(([, row]) => row))
    const left = Math.min(...doorCols) - 2
    const right = Math.max(...doorCols) + 2
    const rows = [t.roofEdge, t.roof, t.cornice, t.brick]
    rows.forEach((tile, index) => {
      const row = doorRow - rows.length + index
      for (let col = left; col <= right; col++) {
        const isDoor = index === rows.length - 1 && doorCols.includes(col)
        grid.set('collision', col, row, isDoor ? -1 : tile)
        if (isDoor) grid.set('ground', col, row, t.door)
      }
    })
  }

  // Виходи — дорога, що виходить за край мапи.
  for (const exit of zone.exits) {
    for (const [col, row] of grid.cells(exit)) {
      grid.set('collision', col, row, -1)
      for (let depth = 0; depth < 4; depth++) {
        const towardsRight = col >= grid.width / 2
        grid.set('ground', towardsRight ? col - depth : col + depth, row, t.road)
      }
    }
  }
  return { grid, tileset: kenneyUrban }
}

function drawIndoors(zone) {
  const t = indoorTiles
  const grid = new Grid(zone, 16)
  grid.fill('ground', t.floor)
  grid.perimeter('collision', t.wall)
  // Верхня стіна товща — так приміщення читається зверху.
  for (let col = 0; col < grid.width; col++) grid.set('collision', col, 1, t.wall)

  for (const door of zone.doors) {
    for (const [col, row] of grid.cells(door)) {
      grid.set('collision', col, row, -1)
      grid.set('ground', col, row, t.carpet)
    }
  }
  for (const exit of zone.exits) {
    for (const [col, row] of grid.cells(exit)) {
      grid.set('collision', col, row, -1)
      grid.set('ground', col, row, t.door)
    }
  }
  return { grid, tileset: kenneyIndoors }
}

function toTiledJson({ grid, tileset }) {
  const layer = (id, name, data) => ({
    data: data.map((index) => index + 1), // gid = індекс + firstgid(1), 0 — порожньо
    height: grid.height, width: grid.width, id, name,
    opacity: 1, type: 'tilelayer', visible: true, x: 0, y: 0,
  })
  const { collides, ...tilesetFields } = tileset
  return {
    compressionlevel: -1,
    height: grid.height,
    width: grid.width,
    infinite: false,
    layers: [layer(1, 'ground', grid.ground), layer(2, 'collision', grid.collision)],
    nextlayerid: 3,
    nextobjectid: 1,
    orientation: 'orthogonal',
    properties: [{ name: 'generated', type: 'string', value: GENERATED_MARK }],
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: grid.tileSize,
    tilewidth: grid.tileSize,
    tilesets: [
      {
        ...tilesetFields,
        firstgid: 1,
        tileheight: grid.tileSize,
        tilewidth: grid.tileSize,
        tiles: collides.map((id) => ({
          id, properties: [{ name: 'collides', type: 'bool', value: true }],
        })),
      },
    ],
    type: 'map',
    version: '1.10',
  }
}

// Мапа вважається згенерованою, якщо має властивість generated; L2-мапи без неї впізнаємо за тайлсетом tileset.png.
function isHandMade(file) {
  if (!fs.existsSync(file)) return false
  const map = JSON.parse(fs.readFileSync(file, 'utf8'))
  const generated = map.properties?.some((prop) => prop.name === 'generated')
  const legacy = map.tilesets?.length === 1 && map.tilesets[0].image === 'tileset.png' && !map.properties
  return !generated && !legacy
}

fs.mkdirSync(OUT_DIR, { recursive: true })
console.log(`kenney urban:   ${kenneyUrban ? kenneyUrban.image : 'немає, плейсхолдер'}`)
console.log(`kenney indoors: ${kenneyIndoors ? kenneyIndoors.image : 'немає, плейсхолдер'}`)
for (const zone of city.zones) {
  const outFile = path.join(OUT_DIR, `${zone.tilemap}.json`)
  if (isHandMade(outFile)) {
    console.log(`skip ${zone.tilemap}.json  (мапа з Tiled)`)
    continue
  }
  const outdoor = zone.type === 'outdoor'
  const drawn = outdoor
    ? kenneyUrban ? drawUrban(zone) : drawPlaceholder(zone)
    : kenneyIndoors ? drawIndoors(zone) : drawPlaceholder(zone)
  fs.writeFileSync(outFile, JSON.stringify(toTiledJson(drawn)))
  console.log(`ok   ${zone.tilemap}.json  ${drawn.grid.width}x${drawn.grid.height} ${drawn.tileset.name}  (${zone.id})`)
}
