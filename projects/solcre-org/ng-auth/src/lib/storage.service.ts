import { Injectable, InjectionToken, Inject, Optional } from '@angular/core';

export const LOCAL_STORAGE_PREFIX = new InjectionToken<string>('LOCAL_STORAGE_PREFIX');

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private prefix: string;

    constructor(@Optional() @Inject(LOCAL_STORAGE_PREFIX) prefix: string | null) {
        this.prefix = prefix || 'app';
    }

    private getKey(key: string): string {
        return `${this.prefix}.${key}`;
    }

    public set<T>(key: string, value: T): boolean {
        try {
            localStorage.setItem(this.getKey(key), JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    }

    public get<T>(key: string): T | null {
        try {
            const item = localStorage.getItem(this.getKey(key));
            if (item === null) {
                return null;
            }
            return JSON.parse(item) as T;
        } catch {
            return null;
        }
    }

    public remove(key: string): boolean {
        try {
            localStorage.removeItem(this.getKey(key));
            return true;
        } catch {
            return false;
        }
    }

    public clear(): boolean {
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix + '.')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            return true;
        } catch {
            return false;
        }
    }

    public keys(): string[] {
        const keys: string[] = [];
        const prefixWithDot = this.prefix + '.';
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefixWithDot)) {
                keys.push(key.substring(prefixWithDot.length));
            }
        }
        return keys;
    }
}
