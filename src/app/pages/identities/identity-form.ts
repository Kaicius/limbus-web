import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { LimbusApiService, novaChaveIdempotencia } from '../../core/limbus-api.service';
import { ErroApi, Identity, RARITIES, RARITY_LABEL, Rarity, Sinner, Tag } from '../../core/models';
import { Modal } from '../../shared/modal';
import { validarNome } from '../nomes/nomes';

@Component({
  selector: 'app-identity-form',
  imports: [FormsModule, Modal],
  template: `
    <app-modal [titulo]="identity() ? 'Editar Identity' : 'Nova Identity'" (fechar)="fechar.emit()">
      @if (carregando()) {
        <p class="carregando">Carregando Sinners e Tags…</p>
      } @else if (sinners().length === 0 || tags().length === 0) {
        <div class="vazio">
          <strong>Falta cadastro</strong>
          Uma Identity precisa de um Sinner e de pelo menos uma Tag. Cadastre-os antes.
        </div>
      } @else {
        <form (ngSubmit)="salvar()">
          <div class="grade-form">
            <label class="campo largo">
              <span>Sinner</span>
              <select name="sinnerId" [(ngModel)]="sinnerId" [disabled]="!!identity()" required>
                @for (s of sinners(); track s.id) {
                  <option [ngValue]="s.id">{{ s.nome }}</option>
                }
              </select>
              @if (identity()) {
                <span class="dica">O Sinner dono não pode ser alterado.</span>
              }
            </label>

            <label class="campo largo">
              <span>Nome</span>
              <input type="text" name="nome" [(ngModel)]="nome" required minlength="2" maxlength="100" autocomplete="off"
                placeholder="[The Index Proselyte] Yi Sang" />
            </label>

            <label class="campo">
              <span>Uptie (1 a 4)</span>
              <input type="number" name="uptie" [(ngModel)]="uptie" required min="1" max="4" />
            </label>

            <label class="campo">
              <span>Raridade</span>
              <select name="rarity" [(ngModel)]="rarity" required>
                @for (r of raridades; track r) {
                  <option [ngValue]="r">{{ rotuloRaridade[r] }}</option>
                }
              </select>
            </label>

            <fieldset class="largo">
              <legend>Tags (de 1 a 10)</legend>
              <div class="opcoes">
                @for (t of tags(); track t.id) {
                  <label>
                    <input type="checkbox" [checked]="tagIds().has(t.id)" (change)="alternarTag(t.id)" />
                    {{ t.nome }}
                  </label>
                }
              </div>
            </fieldset>
          </div>

          @if (erro()) {
            <p class="erro-form" role="alert" style="margin-top: 12px">{{ erro() }}</p>
          }

          <div class="rodape-form">
            @if (!identity()) {
              <span class="chave" title="Enviada no cabeçalho X-Idempotency-Key">Chave de idempotência: <code>{{ chave }}</code></span>
            }
            <button type="button" class="btn secundario" (click)="fechar.emit()">Cancelar</button>
            <button type="submit" class="btn" [disabled]="salvando()">{{ salvando() ? 'Salvando…' : 'Salvar' }}</button>
          </div>
        </form>
      }
    </app-modal>
  `,
})
export class IdentityForm implements OnInit {
  private readonly api = inject(LimbusApiService);

  readonly identity = input<Identity | null>(null);
  readonly sinnerInicial = input<number | null>(null);
  readonly salvo = output<{ identity: Identity; repetido: boolean }>();
  readonly fechar = output<void>();

  protected readonly raridades = RARITIES;
  protected readonly rotuloRaridade = RARITY_LABEL;

  protected readonly sinners = signal<Sinner[]>([]);
  protected readonly tags = signal<Tag[]>([]);
  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly erro = signal('');
  protected readonly tagIds = signal<ReadonlySet<number>>(new Set());
  protected readonly chave = novaChaveIdempotencia();

  protected sinnerId: number | null = null;
  protected nome = '';
  protected uptie = 4;
  protected rarity: Rarity = 'ZERO_ZERO_ZERO';

  ngOnInit(): void {
    forkJoin({
      sinners: this.api.listarSinners({ size: 200, sort: 'nome,asc' }),
      tags: this.api.listarTags({ size: 500, sort: 'nome,asc' }),
    }).subscribe({
      next: ({ sinners, tags }) => {
        this.sinners.set(sinners.itens);
        this.tags.set(tags.itens);
        this.preencher();
        this.carregando.set(false);
      },
      error: (erro: ErroApi) => {
        this.erro.set(erro.mensagem);
        this.carregando.set(false);
      },
    });
  }

  private preencher(): void {
    const identity = this.identity();
    if (identity) {
      this.sinnerId = identity.sinner.id;
      this.nome = identity.nome;
      this.uptie = identity.uptie;
      this.rarity = identity.rarity;
      const nomes = new Set(identity.tags.map((t) => t.nome));
      this.tagIds.set(new Set(this.tags().filter((t) => nomes.has(t.nome)).map((t) => t.id)));
    } else {
      this.sinnerId = this.sinnerInicial() ?? this.sinners()[0]?.id ?? null;
    }
  }

  protected alternarTag(id: number): void {
    const novo = new Set(this.tagIds());
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    this.tagIds.set(novo);
  }

  protected salvar(): void {
    const nome = this.nome.trim();
    const problema = this.validar(nome);
    if (problema) {
      this.erro.set(problema);
      return;
    }
    this.salvando.set(true);
    this.erro.set('');

    const corpo = { nome, uptie: this.uptie, rarity: this.rarity, tagIds: [...this.tagIds()] };
    const falhou = (erro: ErroApi) => {
      this.erro.set(erro.mensagem);
      this.salvando.set(false);
    };

    const identity = this.identity();
    if (identity) {
      this.api.atualizarIdentity(identity.id, corpo).subscribe({
        next: (atualizada) => this.salvo.emit({ identity: atualizada, repetido: false }),
        error: falhou,
      });
    } else {
      this.api.criarIdentity(this.sinnerId as number, corpo, this.chave).subscribe({
        next: (criado) => this.salvo.emit({ identity: criado.recurso, repetido: criado.repetido }),
        error: falhou,
      });
    }
  }

  private validar(nome: string): string {
    if (this.sinnerId === null) return 'Escolha o Sinner dono da Identity.';
    const problemaNome = validarNome(nome);
    if (problemaNome) return problemaNome;
    if (!Number.isInteger(this.uptie) || this.uptie < 1 || this.uptie > 4) return 'O uptie deve ser um número inteiro de 1 a 4.';
    if (this.tagIds().size < 1) return 'Marque pelo menos uma Tag.';
    if (this.tagIds().size > 10) return 'Uma Identity pode ter no máximo 10 Tags.';
    return '';
  }
}
