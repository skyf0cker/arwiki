import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { MainPageComponent } from './main-page/main-page.component';
import { SearchComponent } from './search/search.component';
import { AuthGuard } from './auth/auth.guard';
import { InitPlatformGuard } from './auth/init-platform.guard';
import { SearchEngineComponent } from './search-engine/search-engine.component';
import { ErrorComponent } from './error/error.component';
import { PreloadAllModules } from '@angular/router';


const routes: Routes = [
  {
    path: 'error',
    component: ErrorComponent
  },
  {
    path: '',
    canActivateChild: [InitPlatformGuard],
    children: [
      {
        path: '', component: HomeComponent, pathMatch: 'full',
      },
      {
        path: ':lang', redirectTo: ':lang/main', pathMatch: 'full',
      },
      {
        path: ':lang/main', component: MainPageComponent,
      },  
      {
        path: ':lang/category/:category',
        loadChildren: () => import('./category/category.module').then(m => m.CategoryModule),
      },
      {
        path: ':lang/search/:query', component: SearchComponent,
      },
      {
        path: ':lang/dashboard',
        loadChildren: () => import('./user-panel/user-panel.module').then(m => m.UserPanelModule),
      },
      {
        path: ':lang/moderators',
        loadChildren: () => import('./moderators/moderators.module').then(m => m.ModeratorsModule),
      }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(
      routes,
      {useHash: true, preloadingStrategy: PreloadAllModules},
    )
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
