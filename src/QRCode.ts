import { QRErrorCorrectLevel } from './constants'
import QR8bitByte from './QR8bitByte'
import QRBitBuffer from './QRBitBuffer'
import QRPolynomial from './QRPolynomial'
import QRRSBlock from './QRRSBlock'
import { QRUtil } from './QRUtil'

export { QRErrorCorrectLevel } from './constants'

export class QRCode {
  typeNumber: number
  errorCorrectLevel: number
  modules: boolean[][]
  moduleCount: number
  dataCache: any
  dataList: QR8bitByte[]

  constructor(typeNumber: number, errorCorrectLevel: number) {
    this.typeNumber = typeNumber
    this.errorCorrectLevel = errorCorrectLevel
    this.modules = null
    this.moduleCount = 0
    this.dataCache = null
    this.dataList = []
  }

  addData(data: any) {
    const newData = new QR8bitByte(data)
    this.dataList.push(newData)
    this.dataCache = null
  }

  isDark(row: number, col: number) {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      throw new Error(`${row},${col}`)
    }
    return this.modules[row][col]
  }

  getModuleCount() {
    return this.moduleCount
  }

  make() {
    // Calculate automatically typeNumber if provided is < 1
    if (this.typeNumber < 1) {
      let typeNumber
      for (typeNumber = 1; typeNumber < 40; typeNumber++) {
        const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel)

        const buffer = new QRBitBuffer()
        let totalDataCount = 0
        for (let i = 0; i < rsBlocks.length; i++) {
          totalDataCount += rsBlocks[i].dataCount
        }

        for (let i = 0; i < this.dataList.length; i++) {
          const data = this.dataList[i]
          buffer.put(data.mode, 4)
          buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber))
          data.write(buffer)
        }
        if (buffer.getLengthInBits() <= totalDataCount * 8)
          break
      }
      this.typeNumber = typeNumber
    }
    this.makeImpl(false, this.getBestMaskPattern())
  }

  makeImpl(test: boolean, maskPattern: number) {
    this.moduleCount = this.typeNumber * 4 + 17
    this.modules = new Array(this.moduleCount)
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount)
      for (let col = 0; col < this.moduleCount; col++) {
        this.modules[row][col] = null
      }
    }

    this.setupPositionProbePattern(0, 0)
    this.setupPositionProbePattern(this.moduleCount - 7, 0)
    this.setupPositionProbePattern(0, this.moduleCount - 7)
    this.setupPositionAdjustPattern()
    this.setupTimingPattern()
    this.setupTypeInfo(test, maskPattern)

    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test)
    }

    if (this.dataCache == null) {
      this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList)
    }
    this.mapData(this.dataCache, maskPattern)
  }

  setupPositionProbePattern(row: any, col: any) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r)
        continue
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c)
          continue
        if (
          (r >= 0 && r <= 6 && (c === 0 || c === 6))
          || (c >= 0 && c <= 6 && (r === 0 || r === 6))
          || (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          this.modules[row + r][col + c] = true
        }
        else {
          this.modules[row + r][col + c] = false
        }
      }
    }
  }

  getBestMaskPattern() {
    let minLostPoint = 0
    let pattern = 0
    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i)
      const lostPoint = QRUtil.getLostPoint(this)
      if (i === 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint
        pattern = i
      }
    }
    return pattern
  }

  createMovieClip(targetMc: any, instanceName: any, depth: any) {
    const qrMc = targetMc.createEmptyMovieClip(instanceName, depth)
    const cs = 1
    this.make()
    for (let row = 0; row < this.modules.length; row++) {
      const y = row * cs
      for (let col = 0; col < this.modules[row].length; col++) {
        const x = col * cs
        const dark = this.modules[row][col]
        if (dark) {
          qrMc.beginFill(0, 100)
          qrMc.moveTo(x, y)
          qrMc.lineTo(x + cs, y)
          qrMc.lineTo(x + cs, y + cs)
          qrMc.lineTo(x, y + cs)
          qrMc.endFill()
        }
      }
    }
    return qrMc
  }

  setupTimingPattern() {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] != null) {
        continue
      }
      this.modules[r][6] = r % 2 === 0
    }

    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] != null) {
        continue
      }
      this.modules[6][c] = c % 2 === 0
    }
  }

  setupPositionAdjustPattern() {
    const pos = QRUtil.getPatternPosition(this.typeNumber)
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i]
        const col = pos[j]
        if (this.modules[row][col] != null) {
          continue
        }
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
              this.modules[row + r][col + c] = true
            }
            else {
              this.modules[row + r][col + c] = false
            }
          }
        }
      }
    }
  }

  setupTypeNumber(test: any) {
    const bits = QRUtil.getBCHTypeNumber(this.typeNumber)
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1
      this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod
    }
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1
      this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod
    }
  }

  setupTypeInfo(test: any, maskPattern: any) {
    const data = (this.errorCorrectLevel << 3) | maskPattern
    const bits = QRUtil.getBCHTypeInfo(data)
    // vertical
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1
      if (i < 6) {
        this.modules[i][8] = mod
      }
      else if (i < 8) {
        this.modules[i + 1][8] = mod
      }
      else {
        this.modules[this.moduleCount - 15 + i][8] = mod
      }
    }

    // horizontal
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1
      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod
      }
      else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod
      }
      else {
        this.modules[8][15 - i - 1] = mod
      }
    }
    // fixed module
    this.modules[this.moduleCount - 8][8] = !test
  }

  mapData(data: any, maskPattern: any) {
    let inc = -1
    let row = this.moduleCount - 1
    let bitIndex = 7
    let byteIndex = 0

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6)
        col--
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] == null) {
            let dark = false
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) === 1
            }
            const mask = QRUtil.getMask(maskPattern, row, col - c)
            if (mask) {
              dark = !dark
            }
            this.modules[row][col - c] = dark
            bitIndex--
            if (bitIndex === -1) {
              byteIndex++
              bitIndex = 7
            }
          }
        }

        row += inc

        if (row < 0 || this.moduleCount <= row) {
          row -= inc
          inc = -inc
          break
        }
      }
    }
  }

  static PAD0 = 0xEC
  static PAD1 = 0x11

  static createData(typeNumber: number, errorCorrectLevel: number, dataList: QR8bitByte[]) {
    const rsBlocks: QRRSBlock[] = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel)
    const buffer = new QRBitBuffer()
    for (let i = 0; i < dataList.length; i++) {
      const data: QR8bitByte = dataList[i]
      buffer.put(data.mode, 4)
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber))
      data.write(buffer)
    }
    // calc num max data.
    let totalDataCount = 0
    for (let i = 0; i < rsBlocks.length; i++) {
      totalDataCount += rsBlocks[i].dataCount
    }
    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error(`code length overflow. (${buffer.getLengthInBits()}>${totalDataCount * 8})`)
    }
    // end code
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4)
    }
    // padding
    while (buffer.getLengthInBits() % 8 !== 0) {
      buffer.putBit(false)
    }
    // padding
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break
      }
      buffer.put(QRCode.PAD0, 8)
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break
      }
      buffer.put(QRCode.PAD1, 8)
    }
    return QRCode.createBytes(buffer, rsBlocks)
  }

  static createBytes(buffer: QRBitBuffer, rsBlocks: QRRSBlock[]) {
    let offset: number = 0
    let maxDcCount: number = 0
    let maxEcCount: number = 0
    const dcdata: number[][] = Array.from({ length: rsBlocks.length })
    const ecdata: number[][] = Array.from({ length: rsBlocks.length })
    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount: number = rsBlocks[r].dataCount
      const ecCount: number = rsBlocks[r].totalCount - dcCount
      maxDcCount = Math.max(maxDcCount, dcCount)
      maxEcCount = Math.max(maxEcCount, ecCount)
      dcdata[r] = new Array(dcCount)
      for (let i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 0xFF & buffer.buffer[i + offset]
      }
      offset += dcCount
      const rsPoly: QRPolynomial = QRUtil.getErrorCorrectPolynomial(ecCount)
      const rawPoly: QRPolynomial = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1)
      const modPoly: QRPolynomial = rawPoly.mod(rsPoly)
      ecdata[r] = Array.from({ length: rsPoly.getLength() - 1 })
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex: number = i + modPoly.getLength() - ecdata[r].length
        ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0
      }
    }

    let totalCodeCount: number = 0
    for (let i = 0; i < rsBlocks.length; i++) {
      totalCodeCount += rsBlocks[i].totalCount
    }

    const data: number[] = new Array(totalCodeCount)
    let index = 0

    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) {
          data[index++] = dcdata[r][i]
        }
      }
    }

    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) {
          data[index++] = ecdata[r][i]
        }
      }
    }
    return data
  }

  static createCanvas(options: any) {
    const opt = Object.assign({
      width: 256,
      height: 256,
      correctLevel: QRErrorCorrectLevel.H,
      background: '#ffffff',
      foreground: '#000000',
    }, options)
    const qrcode = new QRCode(-1, opt.correctLevel)
    qrcode.addData(opt.text)
    qrcode.make()

    const canvas = document.createElement('canvas')
    canvas.width = opt.width
    canvas.height = opt.height
    const ctx = canvas.getContext('2d')

    const tileW = opt.width / qrcode.getModuleCount()
    const tileH = opt.height / qrcode.getModuleCount()
    for (let row = 0; row < qrcode.getModuleCount(); row++) {
      for (let col = 0; col < qrcode.getModuleCount(); col++) {
        ctx.fillStyle = qrcode.isDark(row, col) ? opt.foreground : opt.background
        const w = (Math.ceil((col + 1) * tileW) - Math.floor(col * tileW))
        const h = (Math.ceil((row + 1) * tileH) - Math.floor(row * tileH))
        ctx.fillRect(Math.round(col * tileW), Math.round(row * tileH), w, h)
      }
    }
    return canvas
  }

  static setCanvas(id: string, options: any) {
    const parent = document.getElementById(id)
    parent.innerHTML = ''
    parent.appendChild(QRCode.createCanvas(options))
  }
}