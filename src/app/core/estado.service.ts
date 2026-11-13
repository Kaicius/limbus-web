import { Injectable, signal } from '@angular/core';

export type VersaoApi = '1' | '2';

const CHAVE_VERSAO = 'limbus.versaoApi';
const CHAVE_DE_API = 'limbus.chaveDeApi';

@Injectable({ providedIn: 'root' })
export class EstadoService {
  readonly versao = signal<VersaoApi>(this.lerVersaoSalva());
  readonly chaveDeApi = signal<string>(this.lerChaveSalva());

  readonly limite = signal<number | null>(null);
  readonly restante = signal<number | null>(null);
  readonly bloqueadoAte = signal<number | null>(null);

  definirVersao(versao: VersaoApi): void {
    this.versao.set(versao);
    try {
      localStorage.setItem(CHAVE_VERSAO, versao);
    } catch {
    }
  }

  definirChaveDeApi(chave: string): void {
    const limpa = chave.trim();
    this.chaveDeApi.set(limpa);
    try {
      if (limpa) localStorage.setItem(CHAVE_DE_API, limpa);
      else localStorage.removeItem(CHAVE_DE_API);
    } catch {
    }
  }

  registrarRateLimit(limite: string | null, restante: string | null, retryAfter: string | null): void {
    if (limite !== null) this.limite.set(Number(limite));
    if (restante !== null) this.restante.set(Number(restante));
    if (retryAfter !== null) {
      this.bloqueadoAte.set(Date.now() + Number(retryAfter) * 1000);
    } else if (restante !== null && Number(restante) > 0) {
      this.bloqueadoAte.set(null);
    }
  }

  private lerChaveSalva(): string {
    try {
      return localStorage.getItem(CHAVE_DE_API) ?? '';
    } catch {
      return '';
    }
  }

  private lerVersaoSalva(): VersaoApi {
    try {
      return localStorage.getItem(CHAVE_VERSAO) === '2' ? '2' : '1';
    } catch {
      return '1';
    }
  }
}
