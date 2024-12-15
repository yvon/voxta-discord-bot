import { EventEmitter } from 'events';

class PromiseEventEmitter extends EventEmitter {
    constructor() {
        super();
        // Garder une trace des listeners qui retournent des promesses
        this.promiseListeners = new Map();
    }

    // Surcharge de emit pour gérer les promesses
    async emitAsync(eventName, ...args) {
        // Récupérer tous les listeners pour cet événement
        const listeners = this.listeners(eventName);
        
        // Exécuter tous les listeners et collecter leurs promesses
        const promises = listeners.map(listener => {
            try {
                const result = listener(...args);
                return result instanceof Promise ? result : Promise.resolve(result);
            } catch (error) {
                return Promise.reject(error);
            }
        });

        // Attendre que toutes les promesses soient résolues
        return Promise.all(promises);
    }
}

const eventBus = new PromiseEventEmitter();

export default eventBus;
