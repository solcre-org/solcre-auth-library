import { NgModule, ModuleWithProviders } from "@angular/core";
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { AuthInterceptor } from './auth.interceptor';
import { LOCAL_STORAGE_PREFIX } from './storage.service';

export interface NgAuthModuleConfig {
    prefix?: string;
}

@NgModule({
    declarations: [], 
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule
    ],
    exports: [],
    providers: [
        provideHttpClient(withInterceptorsFromDi()),
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true
        }
    ]
})
export class NgAuthModule {
    static forRoot(config?: NgAuthModuleConfig): ModuleWithProviders<NgAuthModule> {
        return {
            ngModule: NgAuthModule,
            providers: [
                {
                    provide: LOCAL_STORAGE_PREFIX,
                    useValue: config?.prefix || 'app'
                }
            ]
        };
    }
}