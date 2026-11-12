import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, map, of } from 'rxjs';

import { API_URL, HEADER_IDEMPOTENCIA, HEADER_REPLAY, HEADER_VERSAO } from '../../core/api.config';
import { EstadoService } from '../../core/estado.service';
import { novaChaveIdempotencia } from '../../core/limbus-api.service';
import { ErroApi, Sinner } from '../../core/models';

interface Registro {
  hora: string;
  status: number;
  texto: string;
  ok: boolean;
}

@Component({
  selector: 'app-laboratorio',
  imports: [FormsModule],
  templateUrl: './laboratorio.html',
  styleUrl: './laboratorio.css',
})
export class Laboratorio {
  private readonly http = inject(HttpClient);
  protected readonly estado = inject(EstadoService);
  protected readonly apiUrl = API_URL;
  protected readonly origem = location.origin;

  protected nome = 'Sinner de Teste';
  protected chave = novaChaveIdempotencia();
  protected readonly registros = signal<Registro[]>([]);
  protected readonly criados = signal<number[]>([]);

  protected novaChave(): void {
    this.chave = novaChaveIdempotencia();
  }

  protected enviarPost(comChave: boolean): void {
    const headers = comChave ? new HttpHeaders({ [HEADER_IDEMPOTENCIA]: this.chave }) : new HttpHeaders();
    const rotulo = comChave ? `POST /sinners com a chave ${this.chave.slice(0, 8)}…` : 'POST /sinners SEM a chave';

    this.http.post<Sinner>(`${API_URL}/sinners`, { nome: this.nome }, { headers, observe: 'response' }).subscribe({
      next: (resposta) => {
        const sinner = resposta.body as Sinner;
        const replay = resposta.headers.get(HEADER_REPLAY) === 'true';
        if (!replay) this.criados.update((ids) => [...ids, sinner.id]);
        this.registrar(
          resposta.status,
          replay
            ? `${rotulo} → resposta REPETIDA (Idempotent-Replayed: true). Mesmo Sinner id ${sinner.id}; nada novo foi criado.`
            : `${rotulo} → Sinner criado com id ${sinner.id}.`,
          true,
        );
      },
      error: (erro: ErroApi) => this.registrar(erro.status, `${rotulo} → ${erro.mensagem}`, false),
    });
  }

  protected limparCriados(): void {
    const ids = this.criados();
    if (ids.length === 0) return;
    forkJoin(
      ids.map((id) =>
        this.http.delete<void>(`${API_URL}/sinners/${id}`).pipe(
          map(() => true),
          catchError(() => of(false)),
        ),
      ),
    ).subscribe((resultados) => {
      this.criados.set([]);
      this.registrar(204, `Limpeza: ${resultados.filter(Boolean).length} Sinner(s) de teste excluído(s).`, true);
    });
  }

  private registrar(status: number, texto: string, ok: boolean): void {
    const hora = new Date().toLocaleTimeString('pt-BR');
    this.registros.update((lista) => [{ hora, status, texto, ok }, ...lista].slice(0, 12));
  }

  protected quantidade = 40;
  protected readonly disparando = signal(false);
  protected readonly rajada = signal<{ enviadas: number; aceitas: number; recusadas: number; retryAfter: number | null } | null>(null);

  protected dispararRajada(): void {
    const total = Math.min(Math.max(Math.trunc(this.quantidade) || 1, 1), 300);
    this.disparando.set(true);
    this.rajada.set(null);

    const chamadas = Array.from({ length: total }, () =>
      this.http.get(`${API_URL}/tags`, { params: { size: 1 } }).pipe(
        map(() => ({ aceita: true, retryAfter: null as number | null })),
        catchError((erro: ErroApi) => of({ aceita: false, retryAfter: erro.status === 429 ? (erro.retryAfter ?? null) : null })),
      ),
    );

    forkJoin(chamadas).subscribe((resultados) => {
      const recusadas = resultados.filter((r) => !r.aceita);
      this.rajada.set({
        enviadas: total,
        aceitas: total - recusadas.length,
        recusadas: recusadas.length,
        retryAfter: recusadas.find((r) => r.retryAfter !== null)?.retryAfter ?? null,
      });
      this.disparando.set(false);
    });
  }

  protected identityId = 1;
  protected readonly respostaVersao = signal<{ versao: string; status: number; corpo: string } | null>(null);

  protected buscarVersao(versao: string): void {
    this.http
      .get<unknown>(`${API_URL}/identities/${this.identityId}`, { headers: { [HEADER_VERSAO]: versao }, observe: 'response' })
      .subscribe({
        next: (resposta) =>
          this.respostaVersao.set({ versao, status: resposta.status, corpo: JSON.stringify(resposta.body, null, 2) }),
        error: (erro: ErroApi) => this.respostaVersao.set({ versao, status: erro.status, corpo: erro.mensagem }),
      });
  }
}
