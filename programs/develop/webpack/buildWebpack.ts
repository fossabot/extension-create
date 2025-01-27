// ██████╗ ███████╗██╗   ██╗███████╗██╗      ██████╗ ██████╗
// ██╔══██╗██╔════╝██║   ██║██╔════╝██║     ██╔═══██╗██╔══██╗
// ██║  ██║█████╗  ██║   ██║█████╗  ██║     ██║   ██║██████╔╝
// ██║  ██║██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║     ██║   ██║██╔═══╝
// ██████╔╝███████╗ ╚████╔╝ ███████╗███████╗╚██████╔╝██║
// ╚═════╝ ╚══════╝  ╚═══╝  ╚══════╝╚══════╝ ╚═════╝ ╚═╝

import webpack from 'webpack'
import path from 'path'
import fs from 'fs'
import {log, error} from 'console'
import {blue, green, bold, red, underline} from '@colors/colors/safe'
import compilerConfig from './webpack-config'
import {type BuildOptions} from '../extensionBuild'
import {getOutputPath} from './config/getPath'

function getFileSize(fileSizeInBytes: number): string {
  return `${(fileSizeInBytes / 1024).toFixed(2)}KB`
}

// Function to recursively print the tree structure
function printTree(node: Record<string, any>, prefix = '') {
  Object.keys(node).forEach((key, index, array) => {
    const isLast = index === array.length - 1
    const connector = isLast ? '└─' : '├─'
    const sizeInKB = node[key].size
      ? ` (${getFileSize(node[key].size as number)})`
      : ''
    log(`${prefix}${connector} ${bold(key)}${sizeInKB}`)
    if (typeof node[key] === 'object' && !node[key].size) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      printTree(node[key], `${prefix}${isLast ? '   ' : '|  '}`)
    }
  })
}

function getAssetInfo(assets: Array<{name: string; size: number}> | undefined) {
  log('\n')
  assets?.forEach((asset) => {
    const sizeInKB = getFileSize(asset.size)
    log(
      `• ${bold('Filename:')} ${asset.name}, ${bold('Size:')} ${sizeInKB}, ${bold('Path:')} ${underline(`${asset.name}`)}`
    )
  })
}

function getAssetsTree(assets: webpack.StatsAsset[] | undefined) {
  const assetTree: Record<string, {size: number}> = {}

  assets?.forEach((asset) => {
    const paths = asset.name.split('/')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    let currentLevel: any = assetTree

    paths.forEach((part, index) => {
      if (!currentLevel[part]) {
        currentLevel[part] = {}
      }
      if (index === paths.length - 1) {
        // Last part of the path, add size info
        currentLevel[part] = {size: asset.size}
      } else {
        currentLevel = currentLevel[part]
      }
    })
  })

  log('.')
  printTree(assetTree)
}

function getAssetsSize(assets: any[] | undefined) {
  let totalSize = 0
  assets?.forEach((asset) => {
    totalSize += asset.size
  })

  return getFileSize(totalSize)
}

export default function buildWebpack(
  projectDir: string,
  {browser}: BuildOptions
) {
  const webpackConfig = compilerConfig(projectDir, 'production', {
    mode: 'production',
    browser
  })

  webpack(webpackConfig).run((err, stats) => {
    if (err) {
      error(err.stack || err)
      process.exit(1)
    }

    const vendor = browser || 'chrome'
    // Convert stats object to JSON format
    const statsJson = stats?.toJson()
    const manifestPath = path.join(
      getOutputPath(projectDir, browser || 'chrome'),
      'manifest.json'
    )
    const manifest: Record<string, string> = JSON.parse(
      fs.readFileSync(manifestPath, 'utf8')
    )
    const assets = statsJson?.assets
    const heading = `🧩 ${bold('extension-create')} ${green('►►►')} Building ${bold(manifest.name)} extension using ${bold(vendor)} defaults...\n`
    const buildTime = `\nBuild completed in ${((statsJson?.time || 0) / 1000).toFixed(2)} seconds.`
    const buildStatus = `Build Status: ${stats?.hasErrors() ? red('Failed') : green('Success')}`
    const version = `Version: ${manifest.version}`
    const size = `Size: ${getAssetsSize(assets)}`
    const ready = blue(
      'No errors or warnings found. Your extension is ready for deployment.'
    )

    log(heading)
    getAssetsTree(assets)
    getAssetInfo(assets)
    log(buildTime)
    log(buildStatus)
    log(version)
    log(size)

    if (!stats?.hasErrors()) {
      log(ready)
    }
  })
}
