import { Injectable, signal } from '@angular/core';

interface Pergunta {
  titulo: string;
  texto: string;
  responder: (confirmou: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmarService {
  readonly pergunta = signal<Pergunta | null>(null);

  perguntar(titulo: string, texto: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.pergunta.set({
        titulo,
        texto,
        responder: (confirmou) => {
          this.pergunta.set(null);
          resolve(confirmou);
        },
      });
    });
  }
}
