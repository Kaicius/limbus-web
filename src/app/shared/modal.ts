import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  host: { '(document:keydown.escape)': 'fechar.emit()' },
  template: `
    <div class="fundo" (click)="fechar.emit()">
      <section class="janela" role="dialog" aria-modal="true" [attr.aria-label]="titulo()" (click)="$event.stopPropagation()">
        <header>
          <h2>{{ titulo() }}</h2>
          <button type="button" class="fechar" (click)="fechar.emit()" aria-label="Fechar">×</button>
        </header>
        <div class="corpo"><ng-content /></div>
      </section>
    </div>
  `,
  styles: `
    .fundo {
      position: fixed; inset: 0; z-index: 50; background: rgba(0, 0, 0, .78);
      display: flex; align-items: flex-start; justify-content: center; padding: 6vh 12px 24px; overflow-y: auto;
    }
    .janela { width: min(640px, 100%); background: var(--lc-panel); border: 1px solid var(--lc-line); border-top: 4px solid var(--lc-yellow); }
    header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: #000; }
    h2 { color: var(--lc-yellow); overflow-wrap: anywhere; }
    .fechar { appearance: none; background: none; border: 0; color: var(--lc-text); font-size: 1.7rem; line-height: 1; cursor: pointer; padding: 0 6px; }
    .fechar:hover { color: var(--lc-red); }
    .corpo { padding: 16px; }
  `,
})
export class Modal {
  readonly titulo = input.required<string>();
  readonly fechar = output<void>();
}
