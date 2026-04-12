// 运行: node bump-version.js
const fs = require('fs')

// 更新 version.json
const vFile = './version.json'
const data = JSON.parse(fs.readFileSync(vFile, 'utf8'))
const parts = data.version.split('.').map(Number)
parts[2]++
data.version = parts.join('.')
fs.writeFileSync(vFile, JSON.stringify(data, null, 2) + '\n')

// 同步更新 sw.js 里的 VERSION 常量
const swFile = './sw.js'
let sw = fs.readFileSync(swFile, 'utf8')
sw = sw.replace(/const VERSION = '[^']*'/, `const VERSION = '${data.version}'`)
fs.writeFileSync(swFile, sw)

console.log('版本号已更新为 V' + data.version)
