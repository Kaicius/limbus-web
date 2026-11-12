import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AvisoService } from '../../core/aviso.service';
import { ConfirmarService } from '../../core/confirmar.service';
import { LimbusApiService } from '../../core/limbus-api.service';
import { ErroApi, Pagina, SINS, SLOT_LABEL, Sin, Skill } from '../../core/models';
import { Paginador } from '../../shared/paginador';

@Component({
  selector: 'app-skills',
  imports: [FormsModule, RouterLink, Paginador],
  template: `
    <div class="pagina">
      <header class="pagina-topo">
        <div>
          <h1>Skills</h1>
          <p>Todas as Skills cadastradas. Para criar ou editar uma Skill, abra a Identity dona dela.</p>
        </div>
      </header>

      <div class="barra">
        <label class="campo">
          <span>Filtrar por Sin</span>
          <select [ngModel]="sin()" (ngModelChange)="filtrar($event)">
            <option value="">Todos</option>
            @for (s of sins; track s) {
              <option [value]="s">{{ s }}</option>
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
            <strong>Nenhuma Skill {{ sin() ? 'com esse Sin' : 'cadastrada' }}</strong>
            As Skills são cadastradas na ficha de cada Identity.
          </div>
        } @else {
          <div class="tabela-rolagem">
            <table>
              <thead>
                <tr><th>Nome</th><th>Slot</th><th>Sin</th><th class="num">Moedas</th><th>Identity</th><th><span class="muted">Ações</span></th></tr>
              </thead>
              <tbody>
                @for (s of p.itens; track s.id) {
                  <tr>
                    <td><strong>{{ s.nome }}</strong></td>
                    <td>{{ rotuloSlot[s.slot] }}</td>
                    <td><span class="etiqueta sin" [class]="'sin-' + s.sin">{{ s.sin }}</span></td>
                    <td class="num">{{ s.quantidadeCoins }}</td>
                    <td>
                      @if (s.identity; as identity) {
                        <a [routerLink]="['/identities', identity.id]">{{ identity.nome }}</a>
                      }
                    </td>
                    <td class="acoes">
                      <button type="button" class="btn perigo mini" (click)="excluir(s)">Excluir</button>
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
export class Skills implements OnInit {
  private readonly api = inject(LimbusApiService);
  private readonly avisos = inject(AvisoService);
  private readonly confirmar = inject(ConfirmarService);

  protected readonly sins = SINS;
  protected readonly rotuloSlot = SLOT_LABEL;
  protected readonly sin = signal<Sin | ''>('');
  protected readonly pagina = signal<Pagina<Skill> | null>(null);
  protected readonly carregando = signal(false);
  protected readonly falha = signal<ErroApi | null>(null);

  ngOnInit(): void {
    this.carregar(0);
  }

  protected filtrar(sin: Sin | ''): void {
    this.sin.set(sin);
    this.carregar(0);
  }

  protected carregar(numero: number): void {
    this.carregando.set(true);
    this.falha.set(null);
    this.api.listarSkills({ page: numero, size: 10, sort: 'nome,asc' }, this.sin()).subscribe({
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

  protected async excluir(skill: Skill): Promise<void> {
    const ok = await this.confirmar.perguntar('Excluir Skill', `Excluir "${skill.nome}"? Esta ação não pode ser desfeita.`);
    if (!ok) return;
    this.api.excluirSkill(skill.id).subscribe({
      next: () => {
        this.avisos.ok('Skill excluída.');
        const p = this.pagina();
        this.carregar(p && p.itens.length === 1 && p.numero > 0 ? p.numero - 1 : (p?.numero ?? 0));
      },
      error: (erro: ErroApi) => this.avisos.erro(erro.mensagem),
    });
  }
}
