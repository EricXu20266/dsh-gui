/** Structural type for the locale service's bound translator. */
export interface Translate {
  (key: string): string
  (key: string, params: Record<string, string | number>): string
  readonly exists?: (key: string) => boolean
}
