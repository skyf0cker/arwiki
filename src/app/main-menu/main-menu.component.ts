import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { UserSettingsService } from '../core/user-settings.service';
import { switchMap, map } from 'rxjs/operators';
import { ArweaveService } from '../core/arweave.service';
import { Observable, Subscription, of } from 'rxjs';
import { ArwikiQuery } from '../core/arwiki-query';
import { ArwikiTokenContract } from '../core/arwiki-contracts/arwiki-token';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ArwikiCategoryIndex } from '../core/interfaces/arwiki-category-index';
import ArdbBlock from 'ardb/lib/models/block';
import ArdbTransaction from 'ardb/lib/models/transaction';

@Component({
  selector: 'app-main-menu',
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.scss']
})
export class MainMenuComponent implements OnInit, OnDestroy {
	@Input() opened!: boolean;
	@Output() openedChange = new EventEmitter();
  routerLang: string = '';
  menuSubscription: Subscription = Subscription.EMPTY;
  loading: boolean = false;
  menu: any = {};
  categories: ArwikiCategoryIndex = {};
  category_slugs: string[] = [];
  pages: any;
  defaultTheme: string = '';
  arwikiQuery!: ArwikiQuery;

  constructor(
      private _userSettings: UserSettingsService,
      private _arweave: ArweaveService,
      private _arwikiTokenContract: ArwikiTokenContract,
      private _snackBar: MatSnackBar,
      private _router: Router
    ) { }

  async ngOnInit() {
    this.loading = true;
    this.arwikiQuery = new ArwikiQuery(this._arweave.arweave);

    this.getDefaultTheme();

    this._userSettings.routeLangStream.subscribe(async (data) => {
      if (data != this.routerLang) {
        this.routerLang = data;
        if (this.routerLang) {
          await this.getMenu();
        }  
      }
      
    });

  }

  async getMenu() {
    this.loading = true;
    let networkInfo;
    let maxHeight = 0;
    try {
      networkInfo = await this._arweave.arweave.network.getInfo();
      maxHeight = networkInfo.height;
    } catch (error) {
      this.message(`${error}`, 'error');
      return;
    }
    const maxPages = 30;
    this.menuSubscription = this.getMainMenu(
      this.routerLang,
      maxHeight,
      maxPages
    ).subscribe({
      next: (data) => {
        this.loading = false;
        this.category_slugs = Object.keys(data.categories)
          .sort((f1: any, f2: any) => {
            return data.categories[f1].order - data.categories[f2].order;
          });
       
        this.pages = data.pages;
        this.categories = data.categories;
        this.menu = {};

        for (let cats of this.category_slugs) {
          this.menu[cats] = [];
          if (this.pages && this.pages[cats]) {
            const pages_slugs = Object.keys(this.pages[cats]);
            for (let page_s of pages_slugs) {
              this.menu[cats].push(this.pages[cats][page_s]);
            }
          }
        }
        
      },
      error: (error) => {
        this.loading = false;
        this.message(error, 'error');
      }
    })
  }

  ngOnDestroy() {
    if (this.menuSubscription) {
      this.menuSubscription.unsubscribe();
    }
  }

  getDefaultTheme() {
    this.defaultTheme = this._userSettings.getDefaultTheme();
    this._userSettings.defaultThemeStream.subscribe(
      (theme) => {
        this.defaultTheme = theme;
      }
    );
  }

  toggleSideMenu() {
    this.opened = !this.opened;
    this.openedChange.emit(this.opened);
  }

  getSkeletonLoaderAnimationType() {
    let type = 'progress';
    if (this.defaultTheme === 'arwiki-dark') {
      type = 'progress-dark';
    }
    return type;
  }

  getSkeletonLoaderThemeNgStyle() {
    let ngStyle: any = {
      'height.px': '32',
      'width': '84%',
      'margin-top': '10px',
      'margin-left': '20px'
    };
    if (this.defaultTheme === 'arwiki-dark') {
      ngStyle['background-color'] = '#3d3d3d';
    }

    return ngStyle;
  }


  /*
  *  Custom snackbar message
  */
  message(msg: string, panelClass: string = '', verticalPosition: any = undefined) {
    this._snackBar.open(msg, 'X', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: verticalPosition,
      panelClass: panelClass
    });
  }

  isActiveRouteInCategory(_cat: string) {
    let isActive = false;

    for (let page of this.menu[_cat]) {
      const final = `${this.routerLang}/${page.slug}`;
      isActive = this._router.isActive(final, true);
      if (isActive) {
        break;
      }
    }

    return isActive;
  }


  /*
  * @dev
  */
  getMainMenu(
    _langCode: string,
    _maxHeight: number,
    _limit: number = 100
  ) {
    let globalCat: ArwikiCategoryIndex = {};
    let adminList: string[] = [];
    let verifiedPages: string[] = [];

    return this._arwikiTokenContract.getCategories()
      .pipe(
        switchMap((_categories: ArwikiCategoryIndex) => {
          globalCat = _categories;
          return this._arwikiTokenContract.getAdminList();
        }),
        switchMap((_adminList) => {
          adminList = _adminList;
          return this._arwikiTokenContract.getApprovedPages(_langCode, _limit);
        }),
        switchMap((_approvedPages) => {
          // Sort asc by block height
          verifiedPages = Array.prototype.sort.call(Object.keys(_approvedPages), (a, b) => {
            return _approvedPages[a].start! - _approvedPages[b].start!;
          });


          verifiedPages = verifiedPages.map((slug) => {
            return _approvedPages[slug].content!;
          });

          return this.arwikiQuery.getTXsData(verifiedPages);
        }),
        switchMap((txs: ArdbTransaction[]|ArdbBlock[]) => {
          const finalRes: any = {};
          for (let p of txs) {
            const pTX: ArdbTransaction = new ArdbTransaction(p, this._arweave.arweave); 
            const title = this.arwikiQuery.searchKeyNameInTags(pTX.tags, 'Arwiki-Page-Title');
            const slug = this.arwikiQuery.searchKeyNameInTags(pTX.tags, 'Arwiki-Page-Slug');
            const category = this.arwikiQuery.searchKeyNameInTags(pTX.tags, 'Arwiki-Page-Category');
            const id = pTX.id;
            if (!Object.prototype.hasOwnProperty.call(finalRes, category)) {
              finalRes[category] = {};
            }
            
            finalRes[category][slug] = {
              title: title,
              slug: slug,
              category: category,
              id: id
            };
            
          }
          return of({ categories: globalCat, pages: finalRes });
        })
      );
  }

  sortAsc(a: any, b: any) {


  }

}
