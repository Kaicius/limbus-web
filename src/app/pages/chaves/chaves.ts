import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AvisoService } from '../../core/aviso.service';
import { ConfirmarService } from '../../core/confirmar.service';
import { EstadoService } from '../../core/estado.service';
import { LimbusApiService, novaChaveIdempotencia } from '../../core/limbus-api.service';
import { ChaveDeApi, ChaveDeApiCriada, ErroApi } from '../../core/models';

@Component({
  selector: 'app-chaves',
  imports: [FormsModule, DatePipe],
  templateUrl: './chaves.html',
  styleUrl: './chaves.css',
})
export class Chaves implements OnInit {
  private readonly api = inject(LimbusApiService);
  private readonly avisos = inject(AvisoService);
  private readonly confirmar = inject(ConfirmarService);
  protected readonly estado = inject(EstadoService);

  protected nome = '';
  protected email = '';
  protected readonly gerando = signal(false);
  protected readonly erroForm = signal('');
  protected readonly criada = signal<ChaveDeApiCriada | null>(null);
  private idempotencia = novaChaveIdempotencia();

  protected chaveDigitada = this.estado.chaveDeApi();
  protected readonly carregando = signal(false);
  protected readonly minha = signal<ChaveDeApi | null>(null);
  protected readonly administrador = signal(false);
  protected readonly erroDaChave = signal('');

  protected readonly todas = signal<ChaveDeApi[] | null>(null);

  ngOnInit(): void {
    this.carregar();
  }

  protected gerar(): void {
    const nome = this.nome.trim();
    const email = this.email.trim();
    if (nome.length < 2 || nome.length > 100) {
      this.erroForm.set('O nome precisa ter de 2 a 100 caracteres.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) {
      this.erroForm.set('Informe um e-mail válido (até 150 caracteres).');
      return;
    }
    this.gerando.set(true);
    this.erroForm.set('');
    this.api.gerarChave(nome, email, this.idempotencia).subscribe({
      next: (resultado) => {
        this.criada.set(resultado.recurso);
        this.nome = '';
        this.email = '';
        this.idempotencia = novaChaveIdempotencia();
        this.gerando.set(false);
        if (this.administrador()) this.listarTodas();
      },
      error: (erro: ErroApi) => {
        this.erroForm.set(erro.mensagem);
        this.gerando.set(false);
      },
    });
  }

  protected usar(chave: string): void {
    this.chaveDigitada = chave;
    this.salvarChave();
    this.criada.set(null);
  }

  protected async copiar(chave: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(chave);
      this.avisos.ok('Chave copiada.');
    } catch {
      this.avisos.erro('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  }

  protected salvarChave(): void {
    this.estado.definirChaveDeApi(this.chaveDigitada);
    this.chaveDigitada = this.estado.chaveDeApi();
    this.avisos.ok(this.estado.chaveDeApi() ? 'Chave salva neste navegador.' : 'Chave removida deste navegador.');
    this.carregar();
  }

  protected removerChave(): void {
    this.chaveDigitada = '';
    this.salvarChave();
  }

  protected carregar(): void {
    this.minha.set(null);
    this.administrador.set(false);
    this.todas.set(null);
    this.erroDaChave.set('');
    if (!this.estado.chaveDeApi()) return;

    this.carregando.set(true);
    this.api.minhaChave().subscribe({
      next: (chave) => {
        this.minha.set(chave);
        this.carregando.set(false);
      },
      error: (erro: ErroApi) => {
        this.carregando.set(false);
        if (erro.status === 403) {
          this.administrador.set(true);
          this.listarTodas();
        } else {
          this.erroDaChave.set(erro.status === 401 ? 'Esta chave não existe ou foi revogada. Gere outra acima.' : erro.mensagem);
        }
      },
    });
  }

  protected async revogarMinha(): Promise<void> {
    const ok = await this.confirmar.perguntar(
      'Revogar minha chave',
      'A chave deixa de funcionar agora, e este navegador volta a ficar sem chave. Para gravar de novo será preciso gerar outra.',
    );
    if (!ok) return;
    this.api.revogarMinhaChave().subscribe({
      next: () => {
        this.estado.definirChaveDeApi('');
        this.chaveDigitada = '';
        this.avisos.ok('Chave revogada e removida deste navegador.');
        this.carregar();
      },
      error: (erro: ErroApi) => this.avisos.erro(erro.mensagem),
    });
  }

  private listarTodas(): void {
    this.api.listarChaves().subscribe({
      next: (chaves) => this.todas.set(chaves),
      error: (erro: ErroApi) => this.erroDaChave.set(erro.mensagem),
    });
  }

  protected revogar(chave: ChaveDeApi): void {
    this.api.revogarChave(chave.id).subscribe({
      next: () => {
        this.avisos.ok(`Chave de "${chave.nome}" revogada.`);
        this.listarTodas();
      },
      error: (erro: ErroApi) => this.avisos.erro(erro.mensagem),
    });
  }

  protected async excluir(chave: ChaveDeApi): Promise<void> {
    const ok = await this.confirmar.perguntar('Excluir chave', `Excluir a chave de "${chave.nome}"? Esta ação não pode ser desfeita.`);
    if (!ok) return;
    this.api.excluirChave(chave.id).subscribe({
      next: () => {
        this.avisos.ok('Chave excluída.');
        this.listarTodas();
      },
      error: (erro: ErroApi) => this.avisos.erro(erro.mensagem),
    });
  }
}
