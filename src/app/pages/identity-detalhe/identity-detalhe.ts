import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { AvisoService } from '../../core/aviso.service';
import { ConfirmarService } from '../../core/confirmar.service';
import { EstadoService, VersaoApi } from '../../core/estado.service';
import { Criado, LimbusApiService, novaChaveIdempotencia } from '../../core/limbus-api.service';
import {
  ErroApi,
  Ficha,
  IdentityStatsRequest,
  PASSIVA_TYPES,
  Passive,
  PassiveRequest,
  RARITY_LABEL,
  RESISTANCES,
  RESISTANCE_LABEL,
  SINS,
  SKILL_SLOTS,
  SLOT_LABEL,
  SanityRequest,
  Skill,
  SkillRequest,
} from '../../core/models';
import { Modal } from '../../shared/modal';
import { IdentityForm } from '../identities/identity-form';
import { validarNome } from '../nomes/nomes';

type Formulario = 'identity' | 'stats' | 'sanity' | 'skill' | 'passive';

const STATS_VAZIO: IdentityStatsRequest = {
  hp: 100,
  speed: '3-6',
  defense: 0,
  staggerThreshold: 50,
  resistanceSlash: 'NORMAL',
  resistancePierce: 'NORMAL',
  resistanceBlunt: 'NORMAL',
};
const SANITY_VAZIA: SanityRequest = { panicType: '', increasingFactors: '', decreasingFactors: '' };
const SKILL_VAZIA: SkillRequest = { slot: 'SKILL_1', variante: 1, sin: 'WRATH', nome: '', quantidadeCoins: 1, descricaoEfeito: '' };
const PASSIVE_VAZIA: PassiveRequest = { tipo: 'BATTLE', nome: '', descricao: '' };

@Component({
  selector: 'app-identity-detalhe',
  imports: [FormsModule, NgTemplateOutlet, RouterLink, Modal, IdentityForm],
  templateUrl: './identity-detalhe.html',
  styleUrl: './identity-detalhe.css',
})
export class IdentityDetalhe {
  private readonly api = inject(LimbusApiService);
  private readonly avisos = inject(AvisoService);
  private readonly confirmar = inject(ConfirmarService);
  private readonly router = inject(Router);
  protected readonly estado = inject(EstadoService);

  readonly id = input.required<string>();
  private readonly idNumero = computed(() => Number(this.id()));

  protected readonly rotuloRaridade = RARITY_LABEL;
  protected readonly rotuloResistencia = RESISTANCE_LABEL;
  protected readonly rotuloSlot = SLOT_LABEL;
  protected readonly resistencias = RESISTANCES;
  protected readonly sins = SINS;
  protected readonly slots = SKILL_SLOTS;
  protected readonly tiposPassiva = PASSIVA_TYPES;

  protected readonly ficha = signal<Ficha | null>(null);
  protected readonly carregando = signal(false);
  protected readonly falha = signal<ErroApi | null>(null);

  protected readonly formulario = signal<Formulario | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erroForm = signal('');
  protected readonly chave = signal('');
  protected readonly editandoId = signal<number | null>(null);

  protected stats: IdentityStatsRequest = { ...STATS_VAZIO };
  protected sanity: SanityRequest = { ...SANITY_VAZIA };
  protected skill: SkillRequest = { ...SKILL_VAZIA };
  protected passive: PassiveRequest = { ...PASSIVE_VAZIA };

  constructor() {
    effect(() => {
      this.idNumero();
      this.estado.versao();
      untracked(() => this.carregar());
    });
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.falha.set(null);
    this.api.buscarFicha(this.idNumero(), this.estado.versao()).subscribe({
      next: (ficha) => {
        this.ficha.set(ficha);
        this.carregando.set(false);
      },
      error: (erro: ErroApi) => {
        this.ficha.set(null);
        this.falha.set(erro);
        this.carregando.set(false);
      },
    });
  }

  protected trocarVersao(versao: VersaoApi): void {
    this.estado.definirVersao(versao);
  }

  private abrir(formulario: Formulario, editandoId: number | null): void {
    this.editandoId.set(editandoId);
    this.erroForm.set('');
    this.salvando.set(false);
    this.chave.set(novaChaveIdempotencia());
    this.formulario.set(formulario);
  }

  protected abrirIdentity(): void {
    this.abrir('identity', this.idNumero());
  }

  protected abrirStats(): void {
    const atual = this.ficha()?.stats;
    this.stats = atual
      ? {
          hp: atual.hp,
          speed: atual.speed,
          defense: atual.defense,
          staggerThreshold: atual.staggerThreshold,
          resistanceSlash: atual.resistanceSlash,
          resistancePierce: atual.resistancePierce,
          resistanceBlunt: atual.resistanceBlunt,
        }
      : { ...STATS_VAZIO };
    this.abrir('stats', atual?.id ?? null);
  }

  protected abrirSanity(): void {
    const atual = this.ficha()?.sanity;
    this.sanity = atual
      ? { panicType: atual.panicType, increasingFactors: atual.increasingFactors, decreasingFactors: atual.decreasingFactors }
      : { ...SANITY_VAZIA };
    this.abrir('sanity', atual?.id ?? null);
  }

  protected abrirSkill(skill: Skill | null): void {
    this.skill = skill
      ? {
          slot: skill.slot,
          variante: skill.variante,
          sin: skill.sin,
          nome: skill.nome,
          quantidadeCoins: skill.quantidadeCoins,
          descricaoEfeito: skill.descricaoEfeito,
        }
      : { ...SKILL_VAZIA };
    this.abrir('skill', skill?.id ?? null);
  }

  protected abrirPassive(passive: Passive | null): void {
    this.passive = passive ? { tipo: passive.tipo, nome: passive.nome, descricao: passive.descricao } : { ...PASSIVE_VAZIA };
    this.abrir('passive', passive?.id ?? null);
  }

  protected fecharFormulario(): void {
    this.formulario.set(null);
  }

  protected salvarStats(): void {
    const s = this.stats;
    const problema =
      (!inteiroEntre(s.hp, 1, 99999) && 'O HP deve ser um inteiro de 1 a 99999.') ||
      (!/^[1-9]\d*-[1-9]\d*$/.test(s.speed) && 'A velocidade deve estar no formato mín-máx, ex.: 3-7.') ||
      ((s.speed.length < 3 || s.speed.length > 7) && 'A velocidade deve ter de 3 a 7 caracteres.') ||
      (!inteiroEntre(s.defense, 0, 9999) && 'A defesa deve ser um inteiro de 0 a 9999.') ||
      (!inteiroEntre(s.staggerThreshold, 1, 99999) && 'O limiar de Stagger deve ser um inteiro de 1 a 99999.') ||
      '';
    const id = this.editandoId();
    this.enviar(
      problema,
      'Stats salvos.',
      id === null ? this.api.criarStats(this.idNumero(), s, this.chave()) : this.api.atualizarStats(id, s),
    );
  }

  protected salvarSanity(): void {
    const s: SanityRequest = {
      panicType: this.sanity.panicType.trim(),
      increasingFactors: this.sanity.increasingFactors.trim(),
      decreasingFactors: this.sanity.decreasingFactors.trim(),
    };
    const problema =
      (!s.panicType || !s.increasingFactors || !s.decreasingFactors ? 'Preencha os três campos.' : '') ||
      (Math.max(s.panicType.length, s.increasingFactors.length, s.decreasingFactors.length) > 2000
        ? 'Cada campo pode ter no máximo 2000 caracteres.'
        : '');
    const id = this.editandoId();
    this.enviar(
      problema,
      'Sanity salva.',
      id === null ? this.api.criarSanity(this.idNumero(), s, this.chave()) : this.api.atualizarSanity(id, s),
    );
  }

  protected salvarSkill(): void {
    const s: SkillRequest = { ...this.skill, nome: this.skill.nome.trim(), descricaoEfeito: this.skill.descricaoEfeito.trim() };
    const problema =
      validarNome(s.nome, 1, 255) ||
      (!inteiroEntre(s.variante, 1, 10) && 'A variante deve ser um inteiro de 1 a 10.') ||
      (!inteiroEntre(s.quantidadeCoins, 1, 10) && 'A quantidade de moedas deve ser um inteiro de 1 a 10.') ||
      (!s.descricaoEfeito && 'Descreva o efeito da Skill.') ||
      (s.descricaoEfeito.length > 2000 && 'A descrição pode ter no máximo 2000 caracteres.') ||
      '';
    const id = this.editandoId();
    this.enviar(
      problema,
      'Skill salva.',
      id === null ? this.api.criarSkill(this.idNumero(), s, this.chave()) : this.api.atualizarSkill(id, s),
    );
  }

  protected salvarPassive(): void {
    const p: PassiveRequest = { ...this.passive, nome: this.passive.nome.trim(), descricao: this.passive.descricao.trim() };
    const problema =
      validarNome(p.nome, 1, 255) ||
      (!p.descricao && 'Descreva o efeito da Passiva.') ||
      (p.descricao.length > 2000 && 'A descrição pode ter no máximo 2000 caracteres.') ||
      '';
    const id = this.editandoId();
    this.enviar(
      problema,
      'Passiva salva.',
      id === null ? this.api.criarPassive(this.idNumero(), p, this.chave()) : this.api.atualizarPassive(id, p),
    );
  }

  private enviar(problema: string, sucesso: string, chamada: Observable<unknown>): void {
    if (problema) {
      this.erroForm.set(problema);
      return;
    }
    this.salvando.set(true);
    this.erroForm.set('');
    chamada.subscribe({
      next: (resultado) => {
        const repetido = (resultado as Partial<Criado<unknown>> | null)?.repetido === true;
        this.avisos.ok(repetido ? 'Já estava salvo: a API devolveu a resposta guardada (idempotência).' : sucesso);
        this.formulario.set(null);
        this.salvando.set(false);
        this.carregar();
      },
      error: (erro: ErroApi) => {
        this.erroForm.set(erro.mensagem);
        this.salvando.set(false);
      },
    });
  }

  protected aoSalvarIdentity(): void {
    this.formulario.set(null);
    this.avisos.ok('Identity atualizada.');
    this.carregar();
  }

  protected async excluirIdentity(): Promise<void> {
    const ficha = this.ficha();
    if (!ficha) return;
    const ok = await this.confirmar.perguntar(
      'Excluir Identity',
      `Excluir "${ficha.identity.nome}"? A API só permite se ela não tiver Stats, Sanity, Skills ou Passivas.`,
    );
    if (!ok) return;
    this.api.excluirIdentity(ficha.identity.id).subscribe({
      next: () => {
        this.avisos.ok('Identity excluída.');
        this.router.navigate(['/identities']);
      },
      error: (erro: ErroApi) => this.avisos.erro(erro.mensagem),
    });
  }

  protected excluirStats(id: number): void {
    this.excluir('os Stats', this.api.excluirStats(id));
  }

  protected excluirSanity(id: number): void {
    this.excluir('a Sanity', this.api.excluirSanity(id));
  }

  protected excluirSkill(skill: Skill): void {
    this.excluir(`a Skill "${skill.nome}"`, this.api.excluirSkill(skill.id));
  }

  protected excluirPassive(passive: Passive): void {
    this.excluir(`a Passiva "${passive.nome}"`, this.api.excluirPassive(passive.id));
  }

  private async excluir(oQue: string, chamada: Observable<void>): Promise<void> {
    const ok = await this.confirmar.perguntar('Confirmar exclusão', `Excluir ${oQue}? Esta ação não pode ser desfeita.`);
    if (!ok) return;
    chamada.subscribe({
      next: () => {
        this.avisos.ok('Excluído.');
        this.carregar();
      },
      error: (erro: ErroApi) => this.avisos.erro(erro.mensagem),
    });
  }
}

function inteiroEntre(valor: number, minimo: number, maximo: number): boolean {
  return Number.isInteger(valor) && valor >= minimo && valor <= maximo;
}
