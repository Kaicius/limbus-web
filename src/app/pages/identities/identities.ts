import { Component, OnInit, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AvisoService } from '../../core/aviso.service';
import { LimbusApiService } from '../../core/limbus-api.service';
import { ErroApi, Identity, Pagina, RARITY_LABEL, Sinner, Tag } from '../../core/models';
import { Paginador } from '../../shared/paginador';
import { IdentityForm } from './identity-form';

@Component({
  selector: 'app-identities',
  imports: [FormsModule, RouterLink, Paginador, IdentityForm],
  templateUrl: './identities.html',
})
export class Identities implements OnInit {
  private readonly api = inject(LimbusApiService);
  private readonly avisos = inject(AvisoService);
  private readonly router = inject(Router);

  readonly sinnerId = input<string | undefined>();
  readonly tag = input<string | undefined>();

  protected readonly rotuloRaridade = RARITY_LABEL;
  protected readonly pagina = signal<Pagina<Identity> | null>(null);
  protected readonly carregando = signal(false);
  protected readonly falha = signal<ErroApi | null>(null);
  protected readonly sinners = signal<Sinner[]>([]);
  protected readonly tags = signal<Tag[]>([]);
  protected readonly formAberto = signal(false);

  constructor() {
    effect(() => {
      this.sinnerId();
      this.tag();
      untracked(() => this.carregar(0));
    });
  }

  ngOnInit(): void {
    this.api.listarSinners({ size: 200, sort: 'nome,asc' }).subscribe({ next: (p) => this.sinners.set(p.itens), error: () => {} });
    this.api.listarTags({ size: 500, sort: 'nome,asc' }).subscribe({ next: (p) => this.tags.set(p.itens), error: () => {} });
  }

  protected sinnerIdNumero(): number | null {
    const valor = Number(this.sinnerId());
    return Number.isInteger(valor) && valor > 0 ? valor : null;
  }

  protected carregar(numero: number): void {
    this.carregando.set(true);
    this.falha.set(null);
    this.api
      .listarIdentities({ page: numero, size: 9, sort: 'nome,asc' }, { sinnerId: this.sinnerIdNumero() ?? undefined, tag: this.tag() })
      .subscribe({
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

  protected filtrarPorSinner(id: string): void {
    this.router.navigate(['/identities'], { queryParams: id ? { sinnerId: id } : {} });
  }

  protected filtrarPorTag(nome: string): void {
    this.router.navigate(['/identities'], { queryParams: nome ? { tag: nome } : {} });
  }

  protected aoSalvar(resultado: { identity: Identity; repetido: boolean }): void {
    this.formAberto.set(false);
    this.avisos.ok(
      resultado.repetido
        ? 'Identity já tinha sido criada: a API devolveu a resposta guardada (idempotência).'
        : 'Identity criada. Agora cadastre Stats, Sanity, Skills e Passivas.',
    );
    this.router.navigate(['/identities', resultado.identity.id]);
  }
}
