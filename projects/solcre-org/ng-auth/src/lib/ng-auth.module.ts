import { NgModule } from "@angular/core";
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { LocalStorageModule } from 'angular-2-local-storage';

import { AuthInterceptor } from './auth.interceptor';
import { LoginComponent } from './login/login.component';

@NgModule({
    declarations: [
        LoginComponent
    ], 
    imports: [
        LocalStorageModule,
        CommonModule,
        FormsModule,
        HttpClientModule,
        ReactiveFormsModule,
        LocalStorageModule.forRoot({
            prefix: 'columnis-manager',
            storageType: 'localStorage'
        }),
    ],
    exports: [
        LoginComponent
    ],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true
        },
        LoginComponent,
    ]
})
export class NgAuthModule { } 