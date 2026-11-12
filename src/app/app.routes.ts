import { Routes } from '@angular/router';

import { Identities } from './pages/identities/identities';
import { IdentityDetalhe } from './pages/identity-detalhe/identity-detalhe';
import { Laboratorio } from './pages/laboratorio/laboratorio';
import { Nomes } from './pages/nomes/nomes';
import { Passives } from './pages/passives/passives';
import { Skills } from './pages/skills/skills';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'identities' },
  { path: 'sinners', component: Nomes, data: { recurso: 'sinners' }, title: 'Sinners · Limbus Web' },
  { path: 'tags', component: Nomes, data: { recurso: 'tags' }, title: 'Tags · Limbus Web' },
  { path: 'identities', component: Identities, title: 'Identities · Limbus Web' },
  { path: 'identities/:id', component: IdentityDetalhe, title: 'Identity · Limbus Web' },
  { path: 'skills', component: Skills, title: 'Skills · Limbus Web' },
  { path: 'passives', component: Passives, title: 'Passivas · Limbus Web' },
  { path: 'laboratorio', component: Laboratorio, title: 'Laboratório · Limbus Web' },
  { path: '**', redirectTo: 'identities' },
];
