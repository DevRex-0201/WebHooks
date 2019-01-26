const fs = require('fs')

const pascalCase = require('pascal-case')
const prettier = require('prettier')
const TypeWriter = require('@gimenete/type-writer')
const webhooks = require('@octokit/webhooks-definitions')

const signatures = []
const tw = new TypeWriter()

webhooks.forEach(({ name, actions, examples }) => {
  if (!examples) {
    return
  }

  const typeName = `WebhookPayload${pascalCase(name)}`
  tw.add(examples, {
    rootTypeName: typeName,
    namedKeyPaths: { [`${typeName}.repository`]: 'PayloadRepository' }
  })

  const events = [
    `'${name}'`,
    ...actions.map(action => `'${name}.${action}'`)
  ].join(' | ')
  signatures.push(`
    public on (event: ${events}, callback: (event: Webhooks.WebhookEvent<${typeName}>) => void): void
  `)
})

const definition = `
// DO NOT EDIT THIS FILE DIRECTLY
// make edits in scripts/generate-types.js

export type Options = {
  secret: string
  path?: string
  transform?: (event: Webhooks.WebhookEvent<T>) => Webhooks.WebhookEvent<T> & { [key: string]: any }
}

${tw.generate('typescript', { inlined: false }).replace(/type /g, 'export type ')}

export namespace Webhooks {
  export interface WebhookEvent<T> {
    id: string
    name: string
    payload: T
    protocol?: 'http' | 'https'
    host?: string
    url?: string
  }
  export class Webhooks {
    constructor (options: Options)

    public on (event: 'error', callback: (event: Error) => void): void
    public on (event: '*' | string[], callback: (event: Webhooks.WebhookEvent<any>) => void): void
    ${signatures.join('\n')}

    public sign (data: any): string
  }
}
`

const filepath = 'index.d.ts'
const output = prettier.format(definition, { filepath })
fs.writeFileSync(filepath, output)