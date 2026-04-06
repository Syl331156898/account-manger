// 运行: node bump-version.js
const fs = require('fs')
const file = './version.json'
const data = JSON.parse(fs.readFileSync(file, 'utf8'))
const parts = data.version.split('.').map(Number)
parts[2]++ // patch 自增
data.version = parts.join('.')
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
console.log('版本号已更新为 V' + data.version)
