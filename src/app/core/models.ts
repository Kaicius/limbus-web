export type Rarity = 'ZERO' | 'ZERO_ZERO' | 'ZERO_ZERO_ZERO';
export type Resistance = 'INEFFECTIVE' | 'NORMAL' | 'WEAK' | 'FATAL';
export type Sin = 'WRATH' | 'LUST' | 'SLOTH' | 'GLOOM' | 'GLUTTONY' | 'ENVY' | 'PRIDE';
export type SkillSlot = 'SKILL_1' | 'SKILL_2' | 'SKILL_3' | 'DEFESA';
export type PassivaType = 'BATTLE' | 'SUPPORT';

export const RARITIES: Rarity[] = ['ZERO', 'ZERO_ZERO', 'ZERO_ZERO_ZERO'];
export const RESISTANCES: Resistance[] = ['INEFFECTIVE', 'NORMAL', 'WEAK', 'FATAL'];
export const SINS: Sin[] = ['WRATH', 'LUST', 'SLOTH', 'GLOOM', 'GLUTTONY', 'ENVY', 'PRIDE'];
export const SKILL_SLOTS: SkillSlot[] = ['SKILL_1', 'SKILL_2', 'SKILL_3', 'DEFESA'];
export const PASSIVA_TYPES: PassivaType[] = ['BATTLE', 'SUPPORT'];

export const RARITY_LABEL: Record<Rarity, string> = { ZERO: '0', ZERO_ZERO: '00', ZERO_ZERO_ZERO: '000' };
export const RESISTANCE_LABEL: Record<Resistance, string> = {
  INEFFECTIVE: 'Ineffective ×0.5',
  NORMAL: 'Normal ×1.0',
  WEAK: 'Weak ×1.5',
  FATAL: 'Fatal ×2.0',
};
export const SLOT_LABEL: Record<SkillSlot, string> = {
  SKILL_1: 'Skill 1',
  SKILL_2: 'Skill 2',
  SKILL_3: 'Skill 3',
  DEFESA: 'Defesa',
};

export interface Sinner {
  id: number;
  nome: string;
}

export interface Tag {
  id: number;
  nome: string;
}

export interface Identity {
  id: number;
  nome: string;
  uptie: number;
  rarity: Rarity;
  sinner: Sinner;
  tags: Tag[];
}

export interface IdentityStats {
  id: number;
  hp: number;
  speed: string;
  defense: number;
  staggerThreshold: number;
  resistanceSlash: Resistance;
  resistancePierce: Resistance;
  resistanceBlunt: Resistance;
}

export interface Sanity {
  id: number;
  panicType: string;
  increasingFactors: string;
  decreasingFactors: string;
}

export interface Skill {
  id: number;
  slot: SkillSlot;
  variante: number;
  sin: Sin;
  nome: string;
  quantidadeCoins: number;
  descricaoEfeito: string;
  identity?: Identity;
}

export interface Passive {
  id: number;
  tipo: PassivaType;
  nome: string;
  descricao: string;
  identity?: Identity;
}

export interface NomeRequest {
  nome: string;
}

export interface IdentityRequest {
  nome: string;
  uptie: number;
  rarity: Rarity;
  tagIds: number[];
}

export type IdentityStatsRequest = Omit<IdentityStats, 'id'>;
export type SanityRequest = Omit<Sanity, 'id'>;
export type SkillRequest = Omit<Skill, 'id' | 'identity'>;
export type PassiveRequest = Omit<Passive, 'id' | 'identity'>;

export interface IdentityFichaV2 {
  id: number;
  nome: string;
  uptie: number;
  rarity: Rarity;
  sinner: Sinner;
  tags: string[];
  stats: IdentityStats | null;
  sanity: Sanity | null;
  skills: Skill[];
  passives: Passive[];
}

export interface Ficha {
  identity: Identity;
  stats: IdentityStats | null;
  sanity: Sanity | null;
  skills: Skill[];
  passives: Passive[];
  versao: '1' | '2';
  requisicoes: number;
}

export interface Pagina<T> {
  itens: T[];
  numero: number;
  tamanho: number;
  totalItens: number;
  totalPaginas: number;
}

export interface RespostaPaginadaHal<T> {
  _embedded?: Record<string, T[]>;
  page: { size: number; totalElements: number; totalPages: number; number: number };
}

export interface ErroApi {
  status: number;
  mensagem: string;
  retryAfter?: number;
}
