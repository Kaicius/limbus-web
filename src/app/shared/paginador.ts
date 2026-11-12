import { Component, computed, input, output } from '@angular/core';

import { Pagina } from '../core/models';

@Component({
  selector: 'app-paginador',
  template: `
    @if (pagina(); as p) {
      <nav class="paginador" aria-label="Paginação">
        <span class="muted pequeno">{{ resumo() }}</span>
        @if (p.totalPaginas > 1) {
          <span class="botoes">
            <button type="button" class="btn secundario mini" [disabled]="p.numero === 0" (click)="mudar.emit(p.numero - 1)">‹ Anterior</button>
            <span class="pequeno">Página {{ p.numero + 1 }} de {{ p.totalPaginas }}</span>
            <button type="button" class="btn secundario mini" [disabled]="p.numero >= p.totalPaginas - 1" (click)="mudar.emit(p.numero + 1)">Próxima ›</button>
          </span>
        }
      </nav>
    }
  `,
  styles: `
    .paginador { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; }
    .botoes { display: inline-flex; align-items: center; gap: 10px; }
  `,
})
export class Paginador {
  readonly pagina = input.required<Pagina<unknown> | null>();
  readonly mudar = output<number>();

  protected readonly resumo = computed(() => {
    const p = this.pagina();
    if (!p || p.totalItens === 0) return '';
    const primeiro = p.numero * p.tamanho + 1;
    const ultimo = primeiro + p.itens.length - 1;
    return `${primeiro}–${ultimo} de ${p.totalItens}`;
  });
}
