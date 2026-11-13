import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';

import { API_URL, HEADER_CHAVE_DE_API, HEADER_LIMITE, HEADER_RESTANTE, HEADER_VERSAO } from './api.config';
import { EstadoService } from './estado.service';
import { ErroApi } from './models';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) {
    return next(req);
  }
  const estado = inject(EstadoService);

  const cabecalhos: Record<string, string> = {};
  if (!req.headers.has(HEADER_VERSAO)) {
    cabecalhos[HEADER_VERSAO] = estado.versao();
  }
  if (!req.headers.has(HEADER_CHAVE_DE_API) && estado.chaveDeApi()) {
    cabecalhos[HEADER_CHAVE_DE_API] = estado.chaveDeApi();
  }
  const requisicao = req.clone({ setHeaders: cabecalhos });

  return next(requisicao).pipe(
    tap((evento) => {
      if (evento instanceof HttpResponse) {
        estado.registrarRateLimit(evento.headers.get(HEADER_LIMITE), evento.headers.get(HEADER_RESTANTE), null);
      }
    }),
    catchError((erro: unknown) => {
      if (erro instanceof HttpErrorResponse) {
        estado.registrarRateLimit(
          erro.headers.get(HEADER_LIMITE),
          erro.headers.get(HEADER_RESTANTE),
          erro.status === 429 ? erro.headers.get('Retry-After') : null,
        );
        return throwError(() => traduzirErro(erro));
      }
      return throwError(() => ({ status: 0, mensagem: 'Erro inesperado no navegador.' }) satisfies ErroApi);
    }),
  );
};

function traduzirErro(erro: HttpErrorResponse): ErroApi {
  if (erro.status === 0) {
    return {
      status: 0,
      mensagem: `Não foi possível falar com a API em ${API_URL}. Ela está rodando? O CORS libera ${location.origin}?`,
    };
  }
  const corpo = erro.error as { mensagem?: string } | null;
  const retryAfter = erro.headers.get('Retry-After');
  let mensagem = corpo?.mensagem ?? `Erro ${erro.status} ao chamar a API.`;
  if (erro.status === 401) {
    mensagem += '. Gere ou informe uma chave na tela "Chaves".';
  }
  return {
    status: erro.status,
    mensagem,
    retryAfter: retryAfter !== null ? Number(retryAfter) : undefined,
  };
}
