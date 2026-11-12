import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, throwError } from 'rxjs';

import { API_URL, HEADER_IDEMPOTENCIA, HEADER_REPLAY, HEADER_VERSAO } from './api.config';
import {
  ErroApi,
  Ficha,
  Identity,
  IdentityFichaV2,
  IdentityRequest,
  IdentityStats,
  IdentityStatsRequest,
  NomeRequest,
  Pagina,
  PassivaType,
  Passive,
  PassiveRequest,
  RespostaPaginadaHal,
  Sanity,
  SanityRequest,
  Sin,
  Sinner,
  Skill,
  SkillRequest,
  Tag,
} from './models';
import { VersaoApi } from './estado.service';

export interface Paginacao {
  page?: number;
  size?: number;
  sort?: string;
}

export interface Criado<T> {
  recurso: T;
  repetido: boolean;
}

export function novaChaveIdempotencia(): string {
  return crypto.randomUUID();
}

@Injectable({ providedIn: 'root' })
export class LimbusApiService {
  private readonly http = inject(HttpClient);

  listarSinners(p: Paginacao = {}, nome = ''): Observable<Pagina<Sinner>> {
    return nome.trim()
      ? this.pagina<Sinner>('/sinners/search', p, { nome: nome.trim() })
      : this.pagina<Sinner>('/sinners', p);
  }
  criarSinner(corpo: NomeRequest, chave: string) {
    return this.criar<Sinner>('/sinners', corpo, chave);
  }
  atualizarSinner(id: number, corpo: NomeRequest) {
    return this.http.put<Sinner>(`${API_URL}/sinners/${id}`, corpo);
  }
  excluirSinner(id: number) {
    return this.http.delete<void>(`${API_URL}/sinners/${id}`);
  }

  listarTags(p: Paginacao = {}, nome = ''): Observable<Pagina<Tag>> {
    return nome.trim()
      ? this.pagina<Tag>('/tags/search', p, { nome: nome.trim() })
      : this.pagina<Tag>('/tags', p);
  }
  criarTag(corpo: NomeRequest, chave: string) {
    return this.criar<Tag>('/tags', corpo, chave);
  }
  atualizarTag(id: number, corpo: NomeRequest) {
    return this.http.put<Tag>(`${API_URL}/tags/${id}`, corpo);
  }
  excluirTag(id: number) {
    return this.http.delete<void>(`${API_URL}/tags/${id}`);
  }

  listarIdentities(p: Paginacao = {}, filtro: { sinnerId?: number; tag?: string } = {}): Observable<Pagina<Identity>> {
    if (filtro.sinnerId) return this.pagina<Identity>(`/sinners/${filtro.sinnerId}/identities`, p);
    if (filtro.tag) return this.pagina<Identity>('/identities/search/by-tag', p, { tag: filtro.tag });
    return this.pagina<Identity>('/identities', p);
  }
  criarIdentity(sinnerId: number, corpo: IdentityRequest, chave: string) {
    return this.criar<Identity>(`/sinners/${sinnerId}/identities`, corpo, chave);
  }
  atualizarIdentity(id: number, corpo: IdentityRequest) {
    return this.http.put<Identity>(`${API_URL}/identities/${id}`, corpo);
  }
  excluirIdentity(id: number) {
    return this.http.delete<void>(`${API_URL}/identities/${id}`);
  }

  buscarFicha(id: number, versao: VersaoApi): Observable<Ficha> {
    const url = `${API_URL}/identities/${id}`;

    if (versao === '2') {
      return this.http
        .get<IdentityFichaV2>(url, { headers: { [HEADER_VERSAO]: '2' } })
        .pipe(map((v2) => fichaDaV2(v2)));
    }

    const v1 = { headers: { [HEADER_VERSAO]: '1' } };
    return forkJoin({
      identity: this.http.get<Identity>(url, v1),
      stats: this.http.get<IdentityStats>(`${url}/stats`, v1).pipe(catchError(nuloSe404)),
      sanity: this.http.get<Sanity>(`${url}/sanity`, v1).pipe(catchError(nuloSe404)),
      skills: this.pagina<Skill>(`/identities/${id}/skills`, { size: 100 }),
      passives: this.pagina<Passive>(`/identities/${id}/passives`, { size: 100 }),
    }).pipe(
      map((r) => ({
        identity: r.identity,
        stats: r.stats,
        sanity: r.sanity,
        skills: r.skills.itens,
        passives: r.passives.itens,
        versao: '1' as const,
        requisicoes: 5,
      })),
    );
  }

  criarStats(identityId: number, corpo: IdentityStatsRequest, chave: string) {
    return this.criar<IdentityStats>(`/identities/${identityId}/stats`, corpo, chave);
  }
  atualizarStats(id: number, corpo: IdentityStatsRequest) {
    return this.http.put<IdentityStats>(`${API_URL}/identity-stats/${id}`, corpo);
  }
  excluirStats(id: number) {
    return this.http.delete<void>(`${API_URL}/identity-stats/${id}`);
  }

  criarSanity(identityId: number, corpo: SanityRequest, chave: string) {
    return this.criar<Sanity>(`/identities/${identityId}/sanity`, corpo, chave);
  }
  atualizarSanity(id: number, corpo: SanityRequest) {
    return this.http.put<Sanity>(`${API_URL}/sanities/${id}`, corpo);
  }
  excluirSanity(id: number) {
    return this.http.delete<void>(`${API_URL}/sanities/${id}`);
  }

  listarSkills(p: Paginacao = {}, sin: Sin | '' = ''): Observable<Pagina<Skill>> {
    return sin ? this.pagina<Skill>('/skills/search/by-sin', p, { sin }) : this.pagina<Skill>('/skills', p);
  }
  criarSkill(identityId: number, corpo: SkillRequest, chave: string) {
    return this.criar<Skill>(`/identities/${identityId}/skills`, corpo, chave);
  }
  atualizarSkill(id: number, corpo: SkillRequest) {
    return this.http.put<Skill>(`${API_URL}/skills/${id}`, corpo);
  }
  excluirSkill(id: number) {
    return this.http.delete<void>(`${API_URL}/skills/${id}`);
  }

  listarPassives(p: Paginacao = {}, tipo: PassivaType | '' = ''): Observable<Pagina<Passive>> {
    return tipo
      ? this.pagina<Passive>('/passives/search/by-tipo', p, { tipo })
      : this.pagina<Passive>('/passives', p);
  }
  criarPassive(identityId: number, corpo: PassiveRequest, chave: string) {
    return this.criar<Passive>(`/identities/${identityId}/passives`, corpo, chave);
  }
  atualizarPassive(id: number, corpo: PassiveRequest) {
    return this.http.put<Passive>(`${API_URL}/passives/${id}`, corpo);
  }
  excluirPassive(id: number) {
    return this.http.delete<void>(`${API_URL}/passives/${id}`);
  }

  private pagina<T>(caminho: string, p: Paginacao, extras: Record<string, string> = {}): Observable<Pagina<T>> {
    let params = new HttpParams({ fromObject: extras });
    if (p.page !== undefined) params = params.set('page', p.page);
    if (p.size !== undefined) params = params.set('size', p.size);
    if (p.sort) params = params.set('sort', p.sort);

    return this.http.get<RespostaPaginadaHal<T>>(API_URL + caminho, { params }).pipe(
      map((hal) => ({
        itens: hal._embedded ? (Object.values(hal._embedded)[0] ?? []) : [],
        numero: hal.page.number,
        tamanho: hal.page.size,
        totalItens: hal.page.totalElements,
        totalPaginas: hal.page.totalPages,
      })),
    );
  }

  private criar<T>(caminho: string, corpo: unknown, chave: string): Observable<Criado<T>> {
    const headers = new HttpHeaders({ [HEADER_IDEMPOTENCIA]: chave });
    return this.http.post<T>(API_URL + caminho, corpo, { headers, observe: 'response' }).pipe(
      map((resposta: HttpResponse<T>) => ({
        recurso: resposta.body as T,
        repetido: resposta.headers.get(HEADER_REPLAY) === 'true',
      })),
    );
  }
}

function nuloSe404(erro: ErroApi): Observable<null> {
  return erro.status === 404 ? of(null) : throwError(() => erro);
}

function fichaDaV2(v2: IdentityFichaV2): Ficha {
  return {
    identity: {
      id: v2.id,
      nome: v2.nome,
      uptie: v2.uptie,
      rarity: v2.rarity,
      sinner: v2.sinner,
      tags: v2.tags.map((nome) => ({ id: 0, nome })),
    },
    stats: v2.stats,
    sanity: v2.sanity,
    skills: v2.skills,
    passives: v2.passives,
    versao: '2',
    requisicoes: 1,
  };
}
