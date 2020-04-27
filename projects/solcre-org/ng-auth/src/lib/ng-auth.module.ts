import { NgModule } from "@angular/core";
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { LocalStorageModule } from 'angular-2-local-storage';

import { AuthInterceptor } from './auth.interceptor';

@NgModule({
    declarations: [], 
    imports: [
        LocalStorageModule,
        CommonModule,
        FormsModule,
        HttpClientModule,
        ReactiveFormsModule
    ],
    exports: [],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true
        }
    ]
})
export class NgAuthModule { } 