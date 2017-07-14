const fs = require('fs')
const path = require('path')
const detective = require('detective-module')

const args = process.argv.slice(2)
const targetPath = args[0]

if (!targetPath || !fs.statSync(targetPath).isDirectory()) {
  console.log('The argument is not a directory.')
  process.exit()
}

/** deps =
[ { name: 'electron', members: [ { name: 'app', alias: 'app' }, { name: 'BrowserWindow', alias: 'BrowserWindow' }, { name: 'ipcMain', alias: 'ipcMain' } ] },
  { name: 'path', default: 'path' },
  { name: 'child_process', members: [ { name: 'exec', alias: 'exec' } ] },
  { name: 'fs', default: 'fs' },
  { name: './app.mode', default: 'testMode' },
  { name: './db', members: [ { name: 'buildExecutionTraceDB', alias: 'buildExecutionTraceDB' } ] },
  { name: './extractor', default: 'extract' },
  { name: './dotBuilder', default: 'buildDotString' } ]
 */
let deps = {}

function retrieveDependencies (dir) {
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const fullPath = path.join(dir, file)
    const fileStat = fs.statSync(fullPath)
    if (fileStat.isDirectory()) {
      retrieveDependencies(fullPath)
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.es6')) {
      const content = fs.readFileSync(fullPath, 'utf-8')
      console.log(fullPath)
      if (content) {
        try {
          deps[fullPath] = detective(content)
        } catch (e) {
          console.log(e)
        }
      }
    }
  })
}

retrieveDependencies(targetPath)

const fileList = Object.keys(deps)

let externalUseRelationSet = new Set([])

fileList.forEach(file => {
  deps[file].forEach(importInfo => {
    const packageName = importInfo.name

    if (packageName && !packageName.startsWith('.')) {
      if (importInfo.members) {
        importInfo.members.forEach(member => {
          externalUseRelationSet.add(`${packageName}/${member.name}`)
        })
      }

      if (importInfo.default) {
        externalUseRelationSet.add(`${packageName}:default`)
      }
    }
  })
})

fs.writeFileSync('./result.txt', Array.from(externalUseRelationSet).sort().join('\n'))
