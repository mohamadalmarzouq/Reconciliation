declare module 'csv-parser' {
  import { Transform } from 'stream'
  
  interface Options {
    headers?: boolean | string[]
    mapHeaders?: (args: { header: string; index: number }) => string
    mapValues?: (args: { header: string; index: number; value: any }) => any
    skipEmptyLines?: boolean
    skipLinesWithError?: boolean
    separator?: string
    quote?: string
    escape?: string
    newline?: string
    strict?: boolean
    raw?: boolean
    maxRowBytes?: number
  }
  
  function csvParser(options?: Options): Transform
  
  export = csvParser
}
