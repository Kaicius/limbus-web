import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AvisoService } from '../../core/aviso.service';
import { ConfirmarService } from '../../core/confirmar.service';
import { LimbusApiService } from '../../core/limbus-api.service';
import { ErroApi, PASSIVA_TYPES, Pagina, PassivaType, Passive } from '../../core/models';
import { Paginador } from '../../shared/paginador';

@Component({
  selector: 'app-passives',
  imports: [FormsModule, RouterLink, Paginador],
  template: `
    <div class="pagina">
      <header class="pagina-topo">
        <div>
          <h1>Passivas</h1>
          <p>Todas as Passivas cadastradas. Para criar ou editar uma Passiva, abra a Identity dona dela.</p>
        </div>
      </header>

      <div class="barra">
        <label class="campo">
          <span>Filtrar por tipo</span>
          <select [ngModel]="tipo()" (ngModelChange)="filtrar($event)">
            <option value="">Todos</option>
            @for (t of tipos; track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
        </label>
      </div>

      @if (falha(); as erro) {
        <div class="falha" role="alert">
          <span>{{ erro.mensagem }}</span>
          <button type="button" class="btn secundario mini" (click)="carregar(pagina()?.numero ?? 0)">Tentar de novo</button>
        </div>
      } @else if (pagina(); as p) {
        @if (p.itens.length === 0) {
          <div class="vazio">
            <strong>Nenhuma Passiva {{ tipo() ? 'desse tipo' : 'cadastrada' }}</strong>
            As Passivas são cadastradas na ficha de cada Identity.
          </div>
        } @else {
          <div class="tabela-rolagem">
            <table>
              <thead>
                <tr><th>Nome</th><th>Tipo</th><th>Descrição</th><th>Identity</th><th><span class="muted">Ações</span></th></tr>
              </thead>
              <tbody>
                @for (passive of p.itens; track passive.id) {
                  <tr>
                    <td><strong>{{ passive.nome }}</strong></td>
                    <td><span class="etiqueta">{{ passive.tipo }}</span></td>
                    <td style="overflow-wrap: anywhere">{{ passive.descricao }}</td>
                    <td>
                      @if (passive.identity; as identity) {
                        <a [routerLink]="['/identities', identity.id]">{{ identity.nome }}</a>
                      }
                    </td>
                    <td class="acoes">
                      <button type="button" class="btn perigo mini" (click)="excluir(passive)">Excluir</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-paginador [pagina]="p" (mudar)="carregar($event)" />
        }
      } @else if (carregando()) {
        <p class="carregando">Carregando…</p>
      }
    </div>
  `,
})
export class Passives implements OnInit {
  private readonly api = inject(LimbusApiService);
  private readonly avisos = inject(AvisoService);
  private readonly confirmar = inject(ConfirmarService);

  protected readonly tipos = PASSIVA_TYPES;
  protected readonly tipo = signal<PassivaType | ''>('');
  protected readonly pagina = signal<Pagina<Passive> | null>(null);
  protected readonly carregando = signal(false);
  protected readonly falha = signal<ErroApi | null>(null);

  ngOnInit(): void {
    this.carregar(0);
  }

  protected filtrar(tipo: PassivaType | ''): void {
    this.tipo.set(tipo);
    this.carregar(0);
  }

  protected carregar(numero: number): void {
    this.carregando.set(true);
    this.falha.set(null);
    this.api.listarPassives({ page: numero, size: 10, sort: 'nome,asc' }, this.tipo()).subscribe({
      next: (pagina) => {
        this.pagina.set(pagina);
        this.carregando.set(false);
      },
      error: (erro: ErroApi) => {
        this.falha.set(erro);
        this.carregando.set(false);
      },
    });
  }

  protected async excluir(passive: Passive): Promise<void> {
    const ok = await this.confirmar.perguntar('Excluir Passiva', `Excluir "${passive.nome}"? Esta ação não pode ser desfeita.`);
    if (!ok) return;
    this.api.excluirPassive(passive.id).subscribe({
      next: () => {
        this.avisos.ok('Passiva excluída.');
        const p = this.pagina();
        this.carregar(p && p.itens.length === 1 && p.numero > 0 ? p.numero - 1 : (p?.numero ?? 0));
      },
      error: (erro: ErroApi) => this.avisos.erro(erro.mensagem),
    });
  }
}
