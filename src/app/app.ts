import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AvisoService } from './core/aviso.service';
import { ConfirmarService } from './core/confirmar.service';
import { EstadoService } from './core/estado.service';
import { Modal } from './shared/modal';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Modal],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  protected readonly estado = inject(EstadoService);
  protected readonly avisos = inject(AvisoService);
  protected readonly confirmar = inject(ConfirmarService);

  protected readonly links = [
    { rota: '/identities', texto: 'Identities' },
    { rota: '/sinners', texto: 'Sinners' },
    { rota: '/tags', texto: 'Tags' },
    { rota: '/skills', texto: 'Skills' },
    { rota: '/passives', texto: 'Passivas' },
    { rota: '/chaves', texto: 'Chaves' },
  ];

  private readonly agora = signal(Date.now());
  private readonly relogio = setInterval(() => this.agora.set(Date.now()), 1000);

  protected readonly esperar = computed(() => {
    const ate = this.estado.bloqueadoAte();
    return ate === null ? 0 : Math.max(0, Math.ceil((ate - this.agora()) / 1000));
  });

  ngOnDestroy(): void {
    clearInterval(this.relogio);
  }
}
