import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  tipo: 'ok' | 'erro' | 'info';
  texto: string;
}

@Injectable({ providedIn: 'root' })
export class AvisoService {
  readonly avisos = signal<Aviso[]>([]);
  private proximoId = 1;

  ok(texto: string): void {
    this.mostrar('ok', texto);
  }

  erro(texto: string): void {
    this.mostrar('erro', texto, 7000);
  }

  info(texto: string): void {
    this.mostrar('info', texto);
  }

  fechar(id: number): void {
    this.avisos.update((lista) => lista.filter((a) => a.id !== id));
  }

  private mostrar(tipo: Aviso['tipo'], texto: string, duracaoMs = 4500): void {
    const id = this.proximoId++;
    this.avisos.update((lista) => [...lista, { id, tipo, texto }]);
    setTimeout(() => this.fechar(id), duracaoMs);
  }
}
