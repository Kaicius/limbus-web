import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AvisoService } from '../../core/aviso.service';
import { ConfirmarService } from '../../core/confirmar.service';
import { LimbusApiService, novaChaveIdempotencia } from '../../core/limbus-api.service';
import { ErroApi, Pagina, Sinner, Tag } from '../../core/models';
import { Modal } from '../../shared/modal';
import { Paginador } from '../../shared/paginador';

type Recurso = 'sinners' | 'tags';
type Item = Sinner | Tag;

const TEXTOS: Record<Recurso, { titulo: string; singular: string; novo: string; fim: string; descricao: string; exemplo: string }> = {
  sinners: {
    titulo: 'Sinners',
    singular: 'Sinner',
    novo: 'Novo Sinner',
    fim: 'o',
    descricao: 'Os personagens jogáveis da Limbus Company. Cada Identity pertence a um Sinner.',
    exemplo: 'Yi Sang',
  },
  tags: {
    titulo: 'Tags',
    singular: 'Tag',
    novo: 'Nova Tag',
    fim: 'a',
    descricao: 'Marcadores temáticos das Identities, como facções e associações.',
    exemplo: 'The Index',
  },
};

@Component({
  selector: 'app-nomes',
  imports: [FormsModule, RouterLink, Modal, Paginador],
  templateUrl: './nomes.html',
})
export class Nomes {
  private readonly api = inject(LimbusApiService);
  private readonly avisos = inject(AvisoService);
  private readonly confirmar = inject(ConfirmarService);

  readonly recurso = input.required<Recurso>();
  protected readonly textos = computed(() => TEXTOS[this.recurso()]);

  protected readonly pagina = signal<Pagina<Item> | null>(null);
  protected readonly carregando = signal(false);
  protected readonly falha = signal<ErroApi | null>(null);
  protected readonly busca = signal('');

  protected readonly formAberto = signal(false);
  protected readonly editando = signal<Item | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erroForm = signal('');
  protected readonly chave = signal('');
  protected nome = '';

  private esperaBusca: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      this.recurso();
      untracked(() => {
        this.busca.set('');
        this.carregar(0);
      });
    });
  }

  protected carregar(numero: number): void {
    this.carregando.set(true);
    this.falha.set(null);
    const paginacao = { page: numero, size: 12, sort: 'nome,asc' };
    const chamada =
      this.recurso() === 'sinners'
        ? this.api.listarSinners(paginacao, this.busca())
        : this.api.listarTags(paginacao, this.busca());

    chamada.subscribe({
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

  protected aoDigitarBusca(texto: string): void {
    this.busca.set(texto);
    clearTimeout(this.esperaBusca);
    this.esperaBusca = setTimeout(() => this.carregar(0), 300);
  }

  protected abrirNovo(): void {
    this.editando.set(null);
    this.nome = '';
    this.erroForm.set('');
    this.chave.set(novaChaveIdempotencia());
    this.formAberto.set(true);
  }

  protected abrirEdicao(item: Item): void {
    this.editando.set(item);
    this.nome = item.nome;
    this.erroForm.set('');
    this.formAberto.set(true);
  }

  protected salvar(): void {
    const nome = this.nome.trim();
    const problema = validarNome(nome);
    if (problema) {
      this.erroForm.set(problema);
      return;
    }
    this.salvando.set(true);
    this.erroForm.set('');
    const { singular, fim } = this.textos();
    const editando = this.editando();
    const sinners = this.recurso() === 'sinners';

    const falhou = (erro: ErroApi) => {
      this.erroForm.set(erro.mensagem);
      this.salvando.set(false);
    };

    if (editando) {
      const chamada = sinners ? this.api.atualizarSinner(editando.id, { nome }) : this.api.atualizarTag(editando.id, { nome });
      chamada.subscribe({
        next: () => this.concluir(`${singular} atualizad${fim}.`),
        error: falhou,
      });
    } else {
      const chamada = sinners ? this.api.criarSinner({ nome }, this.chave()) : this.api.criarTag({ nome }, this.chave());
      chamada.subscribe({
        next: (criado) =>
          this.concluir(
            criado.repetido
              ? `${singular} já tinha sido criad${fim}: a API devolveu a resposta guardada (idempotência).`
              : `${singular} criad${fim}.`,
          ),
        error: falhou,
      });
    }
  }

  protected async excluir(item: Item): Promise<void> {
    const { singular, fim } = this.textos();
    const confirmou = await this.confirmar.perguntar(`Excluir ${singular}`, `Excluir "${item.nome}"? Esta ação não pode ser desfeita.`);
    if (!confirmou) return;

    const chamada = this.recurso() === 'sinners' ? this.api.excluirSinner(item.id) : this.api.excluirTag(item.id);
    chamada.subscribe({
      next: () => {
        this.avisos.ok(`${singular} excluíd${fim}.`);
        const p = this.pagina();
        const numero = p && p.itens.length === 1 && p.numero > 0 ? p.numero - 1 : (p?.numero ?? 0);
        this.carregar(numero);
      },
      error: (erro: ErroApi) => this.avisos.erro(erro.mensagem),
    });
  }

  private concluir(mensagem: string): void {
    this.salvando.set(false);
    this.formAberto.set(false);
    this.avisos.ok(mensagem);
    this.carregar(this.pagina()?.numero ?? 0);
  }
}

export function validarNome(nome: string, minimo = 2, maximo = 100): string {
  if (nome.length < minimo) return minimo > 1 ? `O nome precisa ter pelo menos ${minimo} caracteres.` : 'O nome é obrigatório.';
  if (nome.length > maximo) return `O nome pode ter no máximo ${maximo} caracteres.`;
  if (!/\p{L}/u.test(nome)) return 'O nome precisa conter letras (não pode ser só números ou símbolos).';
  return '';
}
