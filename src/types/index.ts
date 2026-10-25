export type Accent = 'teal' | 'violet' | 'amber' | 'sky' | 'rose'

export type CompetencyId =
    | 'cantidad'
    | 'regularidad'
    | 'forma'
    | 'datos'
    | 'recreativa'

export interface Competency {
    id: CompetencyId
    path: string
    title: string
    shortTitle: string
    description: string
    cardHint: string
    capacities: string[]
    accent: Accent
}

export interface Topic {
    id: string
    path: string
    title: string
    description: string
    icon?: string
    color?: string
    available: boolean
    competency: CompetencyId
}
