import path from 'path'
import {type Compiler} from 'webpack'
import {type RunEdgeExtensionInterface} from '../../types'
import messageDispatcher from './webSocketServer/messageDispatcher'
import startServer from './webSocketServer/startServer'
import rewriteReloadPort from './rewriteReloadPort'
import rewriteFirstRunVariable from './rewriteFirstRunVariable'

export default class CreateWebSocketServer {
  private readonly options: RunEdgeExtensionInterface

  constructor(options: RunEdgeExtensionInterface) {
    this.options = options
  }

  apply(compiler: Compiler) {
    if (!this.options.manifestPath) return

    // Before all, rewrite the reload service file
    // with the user-provided port.
    rewriteReloadPort(this.options.port || 8001)

    // And also rewrite the first run variable.
    // This will change the user active tab on first run.
    rewriteFirstRunVariable()

    // Start webSocket server to communicate with the extension.
    const startConfig = this.options.stats
    const wss = startServer(compiler, startConfig, this.options.port)

    compiler.hooks.watchRun.tapAsync(
      'RunEdgeExtensionPlugin (CreateWebSocketServer)',
      (compiler, done) => {
        const files = compiler.modifiedFiles || new Set()
        const changedFile: string | undefined = files.values().next().value

        if (!changedFile) {
          done()
          return
        }

        const relativePath = path.relative(
          path.dirname(this.options.manifestPath || ''),
          changedFile
        )

        const context = path.relative(process.cwd(), path.dirname(changedFile))
        console.info(
          `►► Updated file \`${relativePath}\` (relative to ${context})`
        )

        if (this.options.manifestPath) {
          messageDispatcher(wss, this.options, changedFile)
        }
        done()
      }
    )
  }
}
